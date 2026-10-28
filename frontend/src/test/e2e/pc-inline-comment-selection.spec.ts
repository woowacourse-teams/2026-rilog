import { expect, test } from '@playwright/test';

import type { PostCommentAnchorResponse, PostCommentAnchorSidebarGroupResponse } from '@/shared/api/posts/types';

const createComposerThreadGroup = (
	selectionId: number,
	selectedText: string,
	startOffset: number,
	commentOverrides: Partial<PostCommentAnchorResponse> = {},
): PostCommentAnchorSidebarGroupResponse => ({
	selectionId,
	blockId: 'block-1',
	range: { startOffset, endOffset: startOffset + selectedText.length },
	selectedText,
	state: 'ACTIVE',
	anchorCount: 1,
	commentAnchors: [
		{
			commentAnchorId: 900 + selectionId,
			content: `${selectedText}에 남긴 기존 댓글입니다. `.repeat(120),
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
			...commentOverrides,
		},
	],
});

for (const width of [1100, 1440]) {
	test(`${width}px 선택 모드 진입·취소에서 본문 폭과 읽던 위치가 유지된다`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.route('https://api.rilog.test/**', async (route) => {
			const path = new URL(route.request().url()).pathname;
			if (path.endsWith('/comment-anchors/sidebar'))
				await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
			else if (path.endsWith('/comment-anchors'))
				await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
			else if (path.endsWith('/history')) await route.fulfill({ status: 204 });
			else await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
		});
		await page.goto('/@the_rilog/posts/101');
		await page.evaluate(() => {
			document.documentElement.style.overflowY = 'scroll';
			document.body.style.minHeight = '1800px';
			window.scrollTo(0, 120);
		});
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		const article = page.getByRole('article', { name: '게시글 본문' });
		const before = await article.boundingBox();
		if (!before) throw new Error('본문 위치를 확인할 수 없습니다.');
		await page.getByRole('button', { name: '댓글 작성' }).click();
		await expect.poll(async () => (await article.boundingBox())?.width).toBeCloseTo(before.width, 0);
		await expect.poll(async () => (await article.boundingBox())?.x).toBeCloseTo(before.x, 0);
		await expect.poll(async () => (await article.boundingBox())?.y).toBeCloseTo(before.y, 0);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		await page.mouse.wheel(0, 250);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		if (width === 1100) await page.goBack();
		else await page.getByRole('button', { name: '선택 취소' }).click();
		await expect(page).toHaveURL(/\/@the_rilog\/posts\/101$/);
		await expect(page.getByRole('button', { name: '댓글 작성' })).toBeVisible();
		await expect.poll(async () => (await article.boundingBox())?.width).toBeCloseTo(before.width, 0);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		await expect.poll(() => page.evaluate(() => document.documentElement.style.overflowY)).toBe('scroll');
	});
}

test('실제 상세의 기존 밑줄은 선택 중에도 남고 호버·클릭은 선택 종료 후에만 반응한다', async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 900 });
	const group = createComposerThreadGroup(91, '실제', 0, { commentAnchorId: 900, content: '기존 댓글' });
	group.blockId = 'article-101';
	group.commentAnchors[0].author.nickname = '작성자';
	await page.route('https://api.rilog.test/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/comment-anchors/sidebar'))
			await route.fulfill({
				json: { status: 200, message: 'OK', data: { anchorGroups: [{ ...group, blockId: 'article-101' }] } },
			});
		else if (path.endsWith('/comment-anchors'))
			await route.fulfill({
				json: { status: 200, message: 'OK', data: { blocks: [{ blockId: 'article-101', anchorGroups: [group] }] } },
			});
		else if (path.endsWith('/history')) await route.fulfill({ status: 204 });
		else await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
	});
	await page.goto('/@the_rilog/posts/101');
	const root = page.locator('[data-inline-comment-block-id="article-101"]');
	const line = page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]');
	await expect(line).toHaveCount(1);
	const anchorButton = page.locator('[data-inline-comment-anchor-proxy]');
	const blockButton = page.locator('[data-inline-comment-block-button]');
	await expect(anchorButton).toBeEnabled();
	await expect(blockButton).toBeEnabled();
	await root.scrollIntoViewIfNeeded();
	const height = (await line.boundingBox())?.height;
	if (height === undefined) throw new Error('밑줄을 찾을 수 없습니다.');
	const point = await root.evaluate((element) => {
		const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
		if (!node) throw new Error('본문 텍스트가 없습니다.');
		const range = document.createRange();
		range.setStart(node, 0);
		range.setEnd(node, 2);
		const rect = range.getBoundingClientRect();
		return { x: rect.left + 2, y: rect.top + rect.height / 2 };
	});
	await page.mouse.move(point.x, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height ?? 0).toBeGreaterThan(height);
	// 포인터가 밑줄 위에 있는 상태에서 모드를 바꿔 기존 호버 강조도 해제되는지 확인한다.
	await page.getByRole('button', { name: '댓글 작성' }).focus();
	await page.keyboard.press('Enter');
	await expect(line).toHaveCount(1);
	await expect(line).toBeVisible();
	await expect(anchorButton).toBeDisabled();
	await expect(blockButton).toBeDisabled();
	await page.mouse.move(point.x, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height).toBe(height);
	await page.mouse.click(point.x, point.y);
	await expect(page.getByRole('dialog', { name: '인라인 댓글 1', exact: true })).toBeHidden();
	await expect(line).toBeVisible();
	await page.getByRole('button', { name: '선택 취소' }).click();
	await expect(anchorButton).toBeEnabled();
	await expect(blockButton).toBeEnabled();
	await page.mouse.move(point.x + 1, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height ?? 0).toBeGreaterThan(height);
	await page.mouse.click(point.x, point.y);
	const comments = page.getByRole('dialog', { name: '인라인 댓글 1', exact: true });
	await expect(comments).toBeVisible();
	await page.getByRole('button', { name: '댓글 사이드바 닫기', exact: true }).click();
	await expect(comments).toBeHidden();
	await anchorButton.focus();
	await page.keyboard.press('Enter');
	await expect(comments).toBeVisible();
});
