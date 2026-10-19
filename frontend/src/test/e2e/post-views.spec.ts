import { readFile, rm } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';

const serverHttpLog = '.the-rilog-build/server-fixture-http.log';
const serverRegistrations = async () =>
	(await readFile(serverHttpLog, 'utf8')).split('\n').filter((line) => /^POST \/v1\/posts\/\d+\/views$/.test(line));

// Real Next entry/history/hydration cannot be exercised by the component-only
// reading fixture. The API is intercepted: these tests do not prove BE dedup or persistence.
test('실제 상세 진입은 인증 초기화 후 등록하고 hover·SSR·댓글 query는 등록하지 않는다', async ({ page, request }) => {
	await rm(serverHttpLog, { force: true });
	const initialization = Promise.withResolvers<void>();
	const visits: number[] = [];
	const runtimeErrors: string[] = [];
	page.on('pageerror', (error) => runtimeErrors.push(error.message));
	await page.route('https://api.rilog.test/**', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === '/v1/auth/token/refresh') {
			await initialization.promise;
			await route.fulfill({ status: 401, json: { errorCode: 'REFRESH_TOKEN_MISSING' } });
		} else if (/\/posts\/\d+\/views$/.test(url.pathname)) {
			visits.push(Number(url.pathname.split('/').at(-2)));
			await route.fulfill({
				status: 503,
				json: {
					status: 503,
					error: 'Service Unavailable',
					errorCode: 'POST_VIEW_REGISTRATION_DISABLED',
					message: 'Disabled',
					invalidParams: null,
				},
			});
		} else if (url.pathname.endsWith('/comment-anchors/sidebar')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
		} else if (url.pathname.endsWith('/comment-anchors')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
		} else if (url.pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED' } });
		}
	});
	const html = await request.get('/@the_rilog/posts/100');
	expect(html.ok()).toBe(true);
	expect(await html.text()).toContain('Daily Headlines');
	// page.route cannot observe Next server fetches. Prove the server recorder is
	// active with the detail GET before asserting that SSR did not register a view.
	expect((await readFile(serverHttpLog, 'utf8')).split('\n')).toContain('GET /v1/blogs/the_rilog/posts/100');
	expect(await serverRegistrations()).toEqual([]);
	await page.goto('/the-rilog');
	const headline = page.getByRole('link', { name: '웹 플랫폼 업데이트', exact: true });
	await headline.hover();
	expect(visits).toEqual([]);
	expect(await serverRegistrations()).toEqual([]);
	await headline.click();
	await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
	expect(visits).toEqual([]);
	initialization.resolve();
	await expect.poll(() => visits).toEqual([100]);
	await expect(page.getByRole('article')).toBeVisible();
	await expect(page.getByRole('button', { name: /전체 댓글 0개 보기/ }).first()).toBeAttached();
	await page.evaluate(() => window.history.pushState(null, '', '?selectionId=1'));
	await expect(page).toHaveURL(/selectionId=1/);
	await page.goBack();
	await expect(page).toHaveURL(/posts\/100#/);
	expect(visits).toEqual([100]);
	await page.goBack();
	await expect(page).toHaveURL(/\/the-rilog$/);
	await page.goForward();
	await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
	await expect.poll(() => visits).toEqual([100, 100]);
	await page.goBack();
	await page.getByRole('link', { name: '기업 기사', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1, name: '기업 기사' })).toBeVisible();
	await expect.poll(() => visits).toEqual([100, 100, 101]);
	expect(await serverRegistrations()).toEqual([]);
	expect(runtimeErrors).toEqual([]);
});

test('권한자의 0을 표시하고 만료 토큰만 한 번 복구하며 성공 후 숫자·상세 GET을 변경하지 않는다', async ({ page }) => {
	let refreshes = 0;
	let registrations = 0;
	let detailReads = 0;
	const authorization: string[] = [];
	await page.route('https://api.rilog.test/**', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === '/v1/auth/token/refresh') {
			refreshes += 1;
			await route.fulfill({
				status: 204,
				headers: {
					Authorization: `Bearer browser-token-${refreshes}`,
					'Access-Control-Expose-Headers': 'Authorization',
					'Access-Control-Allow-Credentials': 'true',
					'Access-Control-Allow-Origin': route.request().headers().origin,
				},
			});
		} else if (url.pathname === '/v1/posts/count') {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { totalPostsCount: 3 } } });
		} else if (url.pathname === '/v1/users/me/cologs/overview') {
			await route.fulfill({ json: { status: 200, message: 'OK', data: [] } });
		} else if (url.pathname === '/v1/notifications/unread-count') {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { unreadCount: 0 } } });
		} else if (/\/posts\/\d+\/views$/.test(url.pathname)) {
			registrations += 1;
			authorization.push(route.request().headers().authorization);
			expect(route.request().method()).toBe('POST');
			expect(route.request().postData()).toBeNull();
			await route.fulfill(
				registrations === 1
					? {
							status: 401,
							json: {
								status: 401,
								error: 'Unauthorized',
								errorCode: 'EXPIRED_ACCESS_TOKEN',
								message: 'Expired',
								invalidParams: null,
							},
						}
					: { status: 204 },
			);
		} else if (/\/blogs\/the_rilog\/posts\/100$/.test(url.pathname)) {
			detailReads += 1;
			await route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: createPostDetailResponseFixture({
						viewerPermissions: { canEdit: true, canDelete: true },
						viewCount: 0,
					}),
				},
			});
		} else if (url.pathname === '/v1/users/me') {
			await route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: { id: 1, slug: 'author', nickname: '작성자', profileImageUrl: null },
				},
			});
		} else if (url.pathname.endsWith('/comment-anchors/sidebar')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
		} else if (url.pathname.endsWith('/comment-anchors')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
		} else if (url.pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 404, json: { errorCode: 'NOT_FOUND' } });
		}
	});
	await page.setViewportSize({ width: 1400, height: 900 });
	await page.goto('/@the_rilog/posts/100');
	await expect(page).toHaveTitle(/Daily Headlines/);
	await expect(page.getByLabel('조회수 0회')).toBeVisible();
	await expect.poll(() => registrations).toBe(2);
	expect(refreshes).toBe(2);
	expect(authorization).toEqual(['Bearer browser-token-1', 'Bearer browser-token-2']);
	expect(detailReads).toBe(1);
	await expect(page.getByLabel('조회수 0회')).toBeVisible();
	await page.getByRole('button', { name: '삭제', exact: true }).click();
	await expect(page.getByRole('dialog', { name: '게시글을 삭제할까요?' })).toBeVisible();
	await page.getByRole('button', { name: '취소', exact: true }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	if (process.env.VIEWS_SCREENSHOT_DIR)
		await page.screenshot({ path: `${process.env.VIEWS_SCREENSHOT_DIR}/post-views-desktop.png` });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByLabel('조회수 0회')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1, name: 'Daily Headlines' })).toBeVisible();
	if (process.env.VIEWS_SCREENSHOT_DIR)
		await page.screenshot({ path: `${process.env.VIEWS_SCREENSHOT_DIR}/post-views-mobile.png` });
	expect(detailReads).toBe(1);
	expect(registrations).toBe(2);
});
