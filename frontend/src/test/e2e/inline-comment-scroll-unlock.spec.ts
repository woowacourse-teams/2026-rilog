import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

// Posting replaces the mobile composer after query invalidation. Verify native dialog,
// document scroll and event cleanup together; jsdom cannot reproduce top-layer locking.
interface PostedSelection {
	blockId: string;
	startOffset: number;
	endOffset: number;
	selectedText: string;
	content: string;
}

const setupPost = async (page: Page, existing: boolean, gate?: Promise<void>, refetchGate?: Promise<void>) => {
	let posted: PostedSelection | null = null;
	let added = false;
	await page.route('https://api.rilog.test/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (path === '/v1/blogs/the_rilog/posts/101') {
			await route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: {
						title: '기업 기사',
						content: [
							{
								id: 'article-101',
								type: 'paragraph',
								props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
								content: [{ type: 'text', text: '실제 게시글 상세 경로에서 표시하는 테스트 본문입니다.', styles: {} }],
								children: [],
							},
						],
						publishedAt: '2026-10-12T05:00:00',
						thumbnailImageUrl: null,
						category: '기술',
						chapter: null,
						author: { userId: 1, nickname: 'Rilog 편집부', slug: 'the_rilog', profileImageUrl: null },
						owner: { type: 'RILOG', blogId: 1, slug: 'the_rilog', name: 'The Rilog.', profileImageUrl: null },
						viewerPermissions: { canEdit: false, canDelete: false },
						viewCount: null,
						postType: 'ENTERPRISE_SPOTLIGHT',
						description: '기업 기사 요약',
						source: { sourceProfileName: '테스트 기업', sourceProfileImage: null },
					},
				},
			});
			return;
		}
		if (request.method() === 'POST' && path === '/v1/posts/101/comment-anchors') {
			posted = request.postDataJSON() as PostedSelection;
			await gate;
			await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 900 } } });
			return;
		}
		if (request.method() === 'POST' && path === '/v1/posts/101/selections/91/comment-anchors') {
			added = true;
			await gate;
			await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 901 } } });
			return;
		}
		if (path.endsWith('/comment-anchors') || path.endsWith('/comment-anchors/sidebar')) {
			if ((posted !== null || added) && refetchGate !== undefined) await refetchGate;
			const group = {
				selectionId: 91,
				range: { startOffset: posted?.startOffset ?? 0, endOffset: posted?.endOffset ?? 2 },
				selectedText: posted?.selectedText ?? '실제',
				state: 'ACTIVE',
				anchorCount: added ? 2 : 1,
				commentAnchors: [posted?.content ?? '기존 댓글', ...(added ? ['추가한 댓글'] : [])].map((content, index) => ({
					commentAnchorId: 900 + index,
					content,
					author: {
						userId: 1,
						nickname: '작성자',
						slug: 'author',
						profileImageUrl: null,
						isPostAuthor: false,
						isBlogMember: false,
					},
					canEdit: false,
					canDelete: false,
					isEdited: false,
					createdAt: '2026-10-26T00:00:00',
					updatedAt: '2026-10-26T00:00:00',
				})),
			};
			const groups = existing || posted !== null ? [group] : [];
			await route.fulfill({
				json: {
					status: 0,
					message: 'OK',
					data: path.endsWith('/sidebar')
						? { anchorGroups: groups.map((anchor) => ({ ...anchor, blockId: 'article-101' })) }
						: { blocks: groups.length ? [{ blockId: 'article-101', anchorGroups: groups }] : [] },
				},
			});
			return;
		}
		if (path === '/v1/posts/count') {
			await route.fulfill({ json: { status: 0, message: 'OK', data: { totalPostsCount: 1 } } });
		} else if (path.endsWith('/views') || path.endsWith('/history')) await route.fulfill({ status: 204 });
		else await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
	});
	await mockAuthenticatedAccess(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(`/@the_rilog/posts/101${existing ? '?selectionId=91' : ''}`);
	// Ensure ample genuine scroll range independently of this short SSR fixture article.
	await page.evaluate(() => {
		document.body.style.minHeight = '2400px';
	});
	if (!existing) {
		await page.locator('[data-inline-comment-block-id="article-101"]').evaluate((element) => {
			const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
			if (!node) throw new Error('본문 텍스트가 없습니다.');
			const range = document.createRange();
			range.setStart(node, 0);
			range.setEnd(node, 2);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			document.dispatchEvent(new Event('selectionchange'));
		});
		await page.getByRole('button', { name: '댓글 추가', exact: true }).click();
	}
	await expect(page.getByRole('region', { name: '댓글 작성 입력바' })).toBeVisible();
};

const dismissAndCheckScroll = async (page: Page, browserName: string) => {
	const dialog = page.getByRole('dialog', { name: /^인라인 댓글 \d+$/ });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await dialog.evaluate(async (element) => {
		element.getBoundingClientRect();
		await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
	});
	const handle = await page.getByRole('button', { name: /댓글창 (확장|축소)/ }).boundingBox();
	if (!handle) throw new Error('손잡이가 없습니다.');
	const x = handle.x + handle.width / 2,
		y = handle.y + handle.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + 120, { steps: 8 });
	await page.mouse.up();
	try {
		await expect(dialog).toBeHidden();
	} catch (error) {
		const state = await page.evaluate(() => ({
			rootStyle: document.documentElement.getAttribute('style'),
			computedOverflow: getComputedStyle(document.documentElement).overflow,
			bodyStyle: document.body.getAttribute('style'),
			articleTouchAction: document.querySelector<HTMLElement>('[data-post-detail-content]')?.style.touchAction,
			dialogs: Array.from(document.querySelectorAll('dialog')).map((element) => ({
				open: element.open,
				modal: element.matches(':modal'),
				state: element.dataset.state,
				rect: { top: element.getBoundingClientRect().top, height: element.getBoundingClientRect().height },
			})),
			selectionPrompt: document.querySelector('[aria-label="댓글 선택 모드"]') !== null,
		}));
		await test
			.info()
			.attach('scroll-lock-state', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
		throw error;
	}
	await expect.poll(() => page.evaluate(() => document.querySelectorAll('dialog:modal').length)).toBe(0);
	const diagnostics = await page.evaluate(() => ({
		inlineOverflow: document.documentElement.style.overflow,
		inlineOverflowX: document.documentElement.style.overflowX,
		inlineOverflowY: document.documentElement.style.overflowY,
		rootStyle: document.documentElement.getAttribute('style'),
		bodyStyle: document.body.getAttribute('style'),
		bodyPosition: getComputedStyle(document.body).position,
		computedOverflow: getComputedStyle(document.documentElement).overflow,
		touchAction: document.querySelector<HTMLElement>('[data-post-detail-content]')?.style.touchAction,
		modalCount: document.querySelectorAll('dialog:modal').length,
		selectionPrompt: document.querySelector('[aria-label="댓글 선택 모드"]') !== null,
	}));
	expect(diagnostics, '닫힌 시트가 문서 스크롤 잠금을 남기지 않아야 합니다.').toMatchObject({
		modalCount: 0,
		selectionPrompt: false,
	});
	expect(diagnostics.computedOverflow).not.toContain('hidden');
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await page.mouse.move(190, 600);
	await page.mouse.wheel(0, 300);
	await expect
		.poll(() => page.evaluate(() => window.scrollY), { message: JSON.stringify(diagnostics) })
		.toBeGreaterThan(100);
	if (browserName === 'chromium') {
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		const session = await page.context().newCDPSession(page);
		await session.send('Emulation.setTouchEmulationEnabled', { enabled: true });
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 650 }] });
		for (let step = 1; step <= 6; step += 1) {
			await session.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [{ x: 190, y: 650 - step * 50 }],
			});
			await page.evaluate(() => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())));
		}
		// Finish compositor momentum before this helper returns to later response/wheel checks.
		const touchSettled = page.evaluate(
			() =>
				new Promise<void>((resolve) => {
					document.addEventListener('scrollend', () => resolve(), { once: true });
				}),
		);
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
		await touchSettled;
		await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
		await session.detach();
		await expect
			.poll(() => page.evaluate(() => window.scrollY), { message: JSON.stringify(diagnostics) })
			.toBeGreaterThan(100);
	}
};

for (const existing of [false, true]) {
	test(`${existing ? '기존 영역에 추가' : '새 영역에 작성'}한 뒤 시트를 내리면 본문을 다시 스크롤할 수 있다`, async ({
		page,
		browserName,
	}) => {
		await setupPost(page, existing);
		const input = page.getByRole('textbox', { name: '댓글 입력', exact: true });
		await input.fill(existing ? '추가한 댓글' : '등록한 새 댓글');
		await page.setViewportSize({ width: 390, height: 400 });
		await page.getByRole('button', { name: '작성', exact: true }).click();
		await expect(page.getByText(existing ? '추가한 댓글' : '등록한 새 댓글', { exact: true })).toBeVisible();
		await page.setViewportSize({ width: 390, height: 844 });
		await dismissAndCheckScroll(page, browserName);
	});
}

test('작성 요청 중 시트를 내리고 늦게 응답이 와도 본문 스크롤을 잠그지 않는다', async ({ page, browserName }) => {
	let release: (() => void) | undefined;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await setupPost(page, false, gate);
	await page.getByRole('textbox', { name: '댓글 입력', exact: true }).fill('늦게 등록한 댓글');
	const request = page.waitForRequest(
		(candidate) => candidate.method() === 'POST' && candidate.url().endsWith('/v1/posts/101/comment-anchors'),
	);
	await page.getByRole('button', { name: '작성', exact: true }).click();
	await request;
	try {
		await dismissAndCheckScroll(page, browserName);
	} finally {
		release?.();
	}
	await expect(page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]')).toHaveCount(1);
	await expect.poll(() => page.evaluate(() => document.querySelectorAll('dialog:modal').length)).toBe(0);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await page.mouse.wheel(0, 300);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});

test('등록 뒤 목록 재조회 중 시트를 내려도 늦은 재조회가 스크롤을 다시 잠그지 않는다', async ({
	page,
	browserName,
}) => {
	let release: (() => void) | undefined;
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await setupPost(page, false, undefined, gate);
	await page.getByRole('textbox', { name: '댓글 입력', exact: true }).fill('등록 뒤 조회 대기');
	const posted = page.waitForResponse(
		(response) => response.request().method() === 'POST' && response.url().endsWith('/v1/posts/101/comment-anchors'),
	);
	const refetch = page.waitForRequest(
		(request) => request.method() === 'GET' && request.url().endsWith('/v1/posts/101/comment-anchors'),
	);
	await page.getByRole('button', { name: '작성', exact: true }).click();
	await posted;
	await refetch;
	try {
		await dismissAndCheckScroll(page, browserName);
	} finally {
		release?.();
	}
	await expect(page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]')).toHaveCount(1);
	await expect.poll(() => page.evaluate(() => document.querySelectorAll('dialog:modal').length)).toBe(0);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await page.mouse.wheel(0, 300);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
});

for (const width of [390, 1440]) {
	test(`${width < 768 ? '모바일' : 'PC'} 본문 이동은 인용을 잠깐 강조하고 기존 밑줄로 복귀한다`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: width < 768 ? 'no-preference' : 'reduce' });
		await setupPost(page, true);
		await page.setViewportSize({ width, height: 844 });
		const quote = page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]');
		await expect(quote).not.toHaveCount(0);
		// Fonts/layout updates may redraw the overlay as navigation begins.
		if (width < 768) {
			await page.locator('dialog[open]').evaluate((dialog) => {
				dialog.addEventListener(
					'close',
					() => window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))),
					{ once: true },
				);
			});
		} else {
			await page.getByRole('button', { name: '본문으로 이동', exact: true }).evaluate((button) => {
				button.addEventListener(
					'click',
					() => window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))),
					{ once: true },
				);
			});
		}
		await page.getByRole('button', { name: '본문으로 이동', exact: true }).click();
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content))
			.toBe('""');
		// An additional reflow during the hold must keep the current quote highlighted.
		await page.evaluate(() => window.dispatchEvent(new Event('resize')));
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content))
			.toBe('""');
		await expect(quote.first()).toBeInViewport();
		if (width < 768) {
			await expect.poll(() => page.evaluate(() => document.querySelectorAll('dialog:modal').length)).toBe(0);
		} else {
			await expect(page.getByRole('heading', { name: '인라인 댓글 1', exact: true })).toBeVisible();
		}
		expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
		await expect(page.getByRole('toolbar', { name: '인라인 댓글', exact: true })).toHaveCount(0);
		expect(
			await quote.first().evaluate((element) => Number.parseFloat(getComputedStyle(element, '::before').opacity)),
		).toBeGreaterThan(0);
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content), { timeout: 5000 })
			.toBe('none');
		await expect(quote).not.toHaveCount(0);
	});
}
