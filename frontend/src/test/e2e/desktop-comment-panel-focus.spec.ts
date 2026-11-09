import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { renderDesktopCommentWorkspace } from './fixtures/desktop-comment-panel-browser';

// Native history, scroll anchoring and focus during container-query entry replacement
// require a browser; the writing smoke flows do not mount this workspace.
const entry = (page: Page) => page.getByRole('button', { name: '전체 댓글 20개 보기', exact: true });
const panel = (page: Page) => page.getByRole('region', { name: '전체 인라인 댓글 20', exact: true });
const prepare = async (page: Page, width: number, selectionId?: number) => {
	await page.setViewportSize({ width, height: 900 });
	const groups = Array.from({ length: 20 }, (_, index) => ({
		selectionId: index + 91,
		blockId: `block-${index + 1}`,
		range: { startOffset: 3, endOffset: 8 },
		selectedText: 'Rilog',
		state: 'ACTIVE',
		anchorCount: 1,
		commentAnchors: [
			{
				commentAnchorId: 900 + index,
				content: `댓글 ${index + 1}. ${'긴 댓글을 읽고 다음 댓글로 이동합니다. '.repeat(25)}`,
				author: {
					userId: 1,
					nickname: '댓글 작성자',
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
			},
		],
	}));
	await page.route('https://api.rilog.test/**', (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/comment-anchors/sidebar'))
			return route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: groups } } });
		if (path.endsWith('/comment-anchors'))
			return route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: { blocks: groups.map((group) => ({ blockId: group.blockId, anchorGroups: [group] })) },
				},
			});
		return route.fulfill({ status: 204 });
	});
	await renderDesktopCommentWorkspace(page, selectionId);
	await expect(page.getByRole('article', { name: '게시글 본문' })).toContainText('80. Rilog');
	await expect(page.getByRole('button', { name: '인용 “Rilog”의 댓글 1개 보기' }).first()).toBeAttached();
	if (selectionId === undefined) await expect(entry(page)).toBeVisible();
};
const settle = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				// Include the 280ms production transition and its ResizeObserver update.
				const start = performance.now();
				const frame = () => (performance.now() - start >= 400 ? resolve() : requestAnimationFrame(frame));
				requestAnimationFrame(frame);
			}),
	);
const position = (page: Page) =>
	page
		.locator('[data-inline-comment-block-id="block-5"]')
		.evaluate((block) => ({ scrollY: window.scrollY, viewportTop: block.getBoundingClientRect().top }));
const open = async (page: Page) => {
	await entry(page).evaluate((button) => {
		(button as HTMLButtonElement).focus({ preventScroll: true });
		(button as HTMLButtonElement).click();
	});
	await expect(panel(page)).toBeVisible();
	await settle(page);
};
for (const width of [1280, 1440, 1920]) {
	for (const method of ['button', 'Escape', 'history'] as const) {
		test(`${width}px: ${method} 닫기 후 진입점 focus와 본문 읽던 위치를 복구한다`, async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', (error) => errors.push(error.message));
			await page.emulateMedia({ reducedMotion: 'no-preference' });
			await prepare(page, width);
			await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
			await settle(page);
			const before = await position(page);
			await open(page);
			if (method === 'button') await panel(page).getByRole('button', { name: '댓글 사이드바 닫기' }).click();
			else if (method === 'Escape') await page.keyboard.press('Escape');
			else await page.goBack();
			await expect(panel(page)).toBeHidden();
			await settle(page);
			await expect(entry(page)).toBeFocused();
			const after = await position(page);
			expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThan(2);
			expect(Math.abs(after.viewportTop - before.viewportTop)).toBeLessThan(2);
			await page.keyboard.press('Tab');
			const next = await page.evaluateHandle(() => document.activeElement);
			expect(await entry(page).evaluate((button) => button === document.activeElement)).toBe(false);
			await settle(page);
			expect(await next.evaluate((element) => element === document.activeElement)).toBe(true);
			expect(errors).toEqual([]);
		});
	}
	test(`${width}px: 다시 연 댓글 목록은 처음부터 표시하고 빠른 재개방을 유지한다`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await prepare(page, width);
		await open(page);
		const list = panel(page).locator('[data-comment-list]');
		await list.evaluate((element) => {
			element.scrollTop = 600;
		});
		expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
		await panel(page).getByRole('button', { name: '댓글 사이드바 닫기' }).click();
		await expect(panel(page)).toBeHidden();
		await entry(page).click();
		await expect(panel(page)).toBeVisible();
		await settle(page);
		await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
		await page.keyboard.press('Escape');
		await expect(panel(page)).toBeHidden();
		await settle(page);
		await expect(entry(page)).toBeFocused();
	});
}

for (const method of ['button', 'Escape', 'history'] as const) {
	test(`1440px 직접 링크: ${method} 닫기 후 현재 진입점으로 focus를 복구한다`, async ({ page }) => {
		await prepare(page, 1440, 91);
		const linkedPanel = page.getByRole('region', { name: '인라인 댓글 1', exact: true });
		await expect(linkedPanel).toBeVisible();
		await settle(page);
		if (method === 'button') await linkedPanel.getByRole('button', { name: '댓글 사이드바 닫기' }).click();
		else if (method === 'Escape') await page.keyboard.press('Escape');
		else await page.goBack();
		await expect(linkedPanel).toBeHidden();
		await settle(page);
		await expect(entry(page)).toBeFocused();
	});
}

for (const width of [1280, 1440, 1920]) {
	test(`${width}px: 닫기 전환 중 이동하거나 본문 클릭으로 해제한 focus를 빼앗지 않는다`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await prepare(page, width);
		await open(page);
		await panel(page).getByRole('button', { name: '댓글 사이드바 닫기' }).click();
		await page.keyboard.press('Tab');
		const next = await page.evaluateHandle(() => document.activeElement);
		expect(
			await entry(page).evaluate(
				(button) => document.activeElement !== button && document.activeElement !== document.body,
			),
		).toBe(true);
		await settle(page);
		expect(await next.evaluate((element) => element === document.activeElement)).toBe(true);

		await open(page);
		await panel(page).getByRole('button', { name: '댓글 사이드바 닫기' }).click();
		await expect(panel(page)).toBeHidden();
		await settle(page);
		await expect(entry(page)).toBeFocused();
		await page.getByRole('article', { name: '게시글 본문' }).click();
		expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
		await page.setViewportSize({ width: 900, height: 900 });
		await settle(page);
		await expect(entry(page)).not.toBeFocused();
	});
}
