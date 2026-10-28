import { rm, writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';
import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';

// These regressions need real Next navigation and the production editor/guard.
// Raw API responses are controlled; BE deletion/authentication are not under test.
async function mockRegressionApi(page: Page, thumbnailImageUrl: string | null = null) {
	const state = {
		authenticated: true,
		deleted: false,
		deleteRequests: 0,
		detailReads: 0,
		refreshReady: Promise.resolve(),
		refetchReady: Promise.resolve(),
		refetchStarted: Promise.withResolvers<void>(),
		unexpected: [] as string[],
		runtimeErrors: [] as string[],
	};
	page.on('pageerror', (error) => state.runtimeErrors.push(error.message));
	await page.route('https://api.rilog.test/**', async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const data = (value: unknown) => route.fulfill({ json: { status: 200, message: 'OK', data: value } });
		if (url.pathname === '/v1/auth/token/refresh') {
			await state.refreshReady;
			await route.fulfill(
				state.authenticated
					? {
							status: 204,
							headers: {
								Authorization: 'Bearer regression-access-token',
								'Access-Control-Expose-Headers': 'Authorization',
								'Access-Control-Allow-Credentials': 'true',
								'Access-Control-Allow-Origin': request.headers().origin,
							},
						}
					: {
							status: 401,
							json: {
								status: 401,
								error: 'Unauthorized',
								errorCode: 'REFRESH_TOKEN_MISSING',
								message: 'Guest',
								invalidParams: null,
							},
						},
			);
		} else if (url.pathname === '/v1/auth/logout') {
			state.authenticated = false;
			await route.fulfill({ status: 204 });
		} else if (url.pathname === '/v1/posts/100' && request.method() === 'DELETE') {
			state.deleteRequests += 1;
			state.deleted = true;
			await route.fulfill({ status: 204 });
		} else if (url.pathname === '/v1/blogs/the_rilog/posts/100') {
			state.detailReads += 1;
			if (state.deleted) {
				state.refetchStarted.resolve();
				await state.refetchReady;
				await route.fulfill({
					status: 404,
					json: {
						status: 404,
						error: 'Not Found',
						errorCode: 'POST_NOT_FOUND',
						message: 'Deleted',
						invalidParams: null,
					},
				});
			} else {
				await data(
					createPostDetailResponseFixture({
						title: '수정할 게시글',
						thumbnailImageUrl,
						owner: { type: 'RILOG', blogId: 1, slug: 'the_rilog', name: 'The Rilog.', profileImageUrl: null },
						viewerPermissions: { canEdit: true, canDelete: true },
						viewCount: 9,
					}),
				);
			}
		} else if (url.pathname === '/v1/users/me') {
			await data({ id: 1, slug: 'the_rilog', nickname: '작성자', profileImageUrl: null });
		} else if (url.pathname === '/v1/users/me/cologs/overview') {
			await data([]);
		} else if (url.pathname === '/v1/notifications/unread-count') {
			await data({ unreadCount: 0 });
		} else if (url.pathname === '/v1/posts/count') {
			await data({ totalPostsCount: state.deleted ? 2 : 3 });
		} else if (url.pathname.endsWith('/views') || url.pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else if (url.pathname.endsWith('/comment-anchors/sidebar')) {
			await data({ anchorGroups: [] });
		} else if (url.pathname.endsWith('/comment-anchors')) {
			await data({ blocks: [] });
		} else if (url.pathname === '/v1/blogs/the_rilog/posts') {
			await data({ type: 'RILOG', posts: [], page: 0, size: 12, numberOfElements: 0, hasNext: false });
		} else if (url.pathname === '/v1/blogs/the_rilog/index') {
			await data({ blogType: 'RILOG', totalCount: 0, chapterIndexes: [], cologIndexes: [] });
		} else {
			state.unexpected.push(`${request.method()} ${url.pathname}`);
			await route.abort('failed');
		}
	});
	return state;
}

test('대표 이미지 응답이 지연되어도 크기 해시로 영역을 먼저 확보한다', async ({ page }) => {
	const imageResponse = Promise.withResolvers<void>();
	const statePath = '.the-rilog-build/server-fixture-state.json';
	const imageUrl = 'https://images.rilog.test/cover.png#1200x800';

	try {
		await writeFile(statePath, JSON.stringify({ thumbnailImageUrl: imageUrl }));
		await page.route('https://images.rilog.test/cover.png', async (route) => {
			await imageResponse.promise;
			await route.abort();
		});
		await mockRegressionApi(page, imageUrl);
		await page.goto('/@the_rilog/posts/100', { waitUntil: 'domcontentloaded' });
		const figure = page.getByRole('figure', { name: 'Daily Headlines 대표 이미지' });
		await expect(figure).toBeVisible();
		const box = await figure.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.height).toBeCloseTo((box?.width ?? 0) * (2 / 3), 0);
		await expect(figure.locator('img')).toHaveAttribute('src', 'https://images.rilog.test/cover.png');
	} finally {
		imageResponse.resolve();
		await rm(statePath, { force: true });
	}
});

test('삭제 뒤 상세 재조회가 지연·404로 끝나도 실제 블로그 홈으로 이동한다', async ({ page }) => {
	const state = await mockRegressionApi(page);
	const refetch = Promise.withResolvers<void>();
	state.refetchReady = refetch.promise;
	await page.goto('/@the_rilog/posts/100');
	await expect(page.getByLabel('조회수 9회')).toBeVisible();
	await page.getByRole('button', { name: '삭제', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
	await state.refetchStarted.promise;
	await expect(page.getByLabel('조회수 9회')).toHaveCount(0);
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/100$/);
	refetch.resolve();
	await expect(page).toHaveURL('/@the_rilog');
	await expect(page.getByRole('heading', { name: 'The Rilog.', exact: true })).toBeVisible();
	expect(state.deleteRequests).toBe(1);
	expect(state.runtimeErrors).toEqual([]);
	expect(state.unexpected).toEqual([]);
	if (process.env.VIEWS_SCREENSHOT_DIR)
		await page.screenshot({ path: `${process.env.VIEWS_SCREENSHOT_DIR}/delete-returned-blog.png` });
});

test('삭제 성공 뒤 상세 재조회 중 로그아웃해도 이전 삭제로 블로그 홈에 이동하지 않는다', async ({ page }) => {
	const state = await mockRegressionApi(page);
	const refetch = Promise.withResolvers<void>();
	state.refetchReady = refetch.promise;
	try {
		await page.goto('/@the_rilog/posts/100');
		await page.getByRole('button', { name: '삭제', exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
		await state.refetchStarted.promise;
		await page.getByRole('complementary', { name: '사이드바' }).hover();
		const proxyCleared = page.waitForResponse(
			(entry) => entry.url().endsWith('/api/auth/proxy-session') && entry.request().method() === 'DELETE',
		);
		await page.getByRole('button', { name: '로그아웃' }).click();
		await proxyCleared;
		await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeAttached();
		refetch.resolve();
		await expect(page).toHaveURL('/@the_rilog/posts/100');
		await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
		await expect(page.getByLabel(/조회수/)).toHaveCount(0);
		expect(state.deleteRequests).toBe(1);
		expect(state.authenticated).toBe(false);
		expect(state.runtimeErrors).toEqual([]);
		expect(state.unexpected).toEqual([]);
		if (process.env.VIEWS_SCREENSHOT_DIR) {
			await page.getByRole('heading', { level: 1, name: 'Daily Headlines' }).hover();
			await page.screenshot({
				path: `${process.env.VIEWS_SCREENSHOT_DIR}/delete-session-logout.png`,
				animations: 'disabled',
			});
		}
	} finally {
		refetch.resolve();
	}
});

test('인증 표식만 남은 비로그인 수정 진입은 초기화 후 돌아가며 상세 GET을 보내지 않는다', async ({ page }) => {
	const state = await mockRegressionApi(page);
	state.authenticated = false;
	const proxyCleared = page.waitForResponse(
		(entry) => entry.url().endsWith('/api/auth/proxy-session') && entry.request().method() === 'DELETE',
	);
	await page.goto('/about');
	await proxyCleared;
	// The server proxy checks this marker, so expired credentials can still reach the client guard.
	await page.context().addCookies([
		{
			name: PROXY_SESSION_COOKIE_NAME,
			value: PROXY_SESSION_COOKIE_VALUE,
			url: new URL(page.url()).origin,
			httpOnly: true,
			sameSite: 'Lax',
		},
	]);
	const initialization = Promise.withResolvers<void>();
	state.refreshReady = initialization.promise;
	await page.goto('/write?slug=the_rilog&postId=100');
	await expect(
		page.getByRole('status', { name: '' }).filter({ hasText: '게시글 수정 권한을 확인하고 있어요.' }),
	).toBeVisible();
	expect(state.detailReads).toBe(0);
	initialization.resolve();
	await expect(page).toHaveURL('/about');
	await expect(page.getByRole('textbox', { name: '게시글 제목' })).toHaveCount(0);
	expect(state.detailReads).toBe(0);
	expect(state.runtimeErrors).toEqual([]);
	expect(state.unexpected).toEqual([]);
});

test('실제 상세에서 수정 화면을 연 뒤 로그아웃하면 편집기를 제거하고 상세로 돌아간다', async ({ page }) => {
	const state = await mockRegressionApi(page);
	await page.goto('/@the_rilog/posts/100');
	await page.getByRole('button', { name: '수정', exact: true }).click();
	await expect(page).toHaveURL(/\/write\?postId=100&slug=the_rilog$/);
	await expect(page.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('수정할 게시글');
	await expect(page.getByRole('textbox', { name: '게시글 내용' })).toBeVisible();
	await page.getByRole('complementary', { name: '사이드바' }).hover();
	await page.getByRole('button', { name: '로그아웃' }).click();
	await expect(page).toHaveURL('/@the_rilog/posts/100');
	await expect(page.getByRole('textbox', { name: '게시글 제목' })).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
	await expect(page.getByLabel(/조회수/)).toHaveCount(0);
	expect(state.authenticated).toBe(false);
	expect(state.runtimeErrors).toEqual([]);
	expect(state.unexpected).toEqual([]);
	if (process.env.VIEWS_SCREENSHOT_DIR)
		await page.screenshot({ path: `${process.env.VIEWS_SCREENSHOT_DIR}/logout-returned-detail.png` });
});
