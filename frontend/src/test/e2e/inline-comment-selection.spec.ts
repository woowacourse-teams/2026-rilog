import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';
import type { PostCommentAnchorCreateRequest } from '@/shared/api/posts/types';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

const dragText = async (page: Page) => {
	const root = page
		.locator('p[data-inline-comment-root]:not(:has(a))')
		.filter({ visible: true, hasText: /\S{3}/ })
		.first();
	await root.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
	const rect = await root.evaluate((element) => {
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node && (node.textContent?.trim().length ?? 0) < 3) node = walker.nextNode();
		if (!node) throw new Error('선택 가능한 본문 텍스트가 없습니다.');
		const range = document.createRange();
		range.setStart(node, 0);
		range.setEnd(node, Math.min(node.textContent?.length ?? 0, 8));
		const firstRect = range.getClientRects()[0];
		return { left: firstRect.left, right: firstRect.right, y: firstRect.top + firstRect.height / 2 };
	});
	await page.mouse.move(rect.left + 1, rect.y);
	await page.mouse.down();
	await page.mouse.move(rect.right - 1, rect.y, { steps: 10 });
	await page.mouse.up();
	return { text: await page.evaluate(() => window.getSelection()?.toString() ?? ''), x: rect.right - 1, y: rect.y };
};

test.beforeEach(async ({ page }) => {
	const latest = getLatestReleaseNote(RELEASE_NOTES);
	if (latest) {
		await page.addInitScript(({ key, id }) => localStorage.setItem(key, id), {
			key: RELEASE_NOTE_STORAGE_KEY,
			id: latest.id,
		});
	}
});

test('본문 드래그로 댓글 입력을 열고 백드롭 닫기 후 초안을 복원한다', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await mockAuthenticatedAccess(page);

	let submitted: PostCommentAnchorCreateRequest | null = null;
	let addedContent: string | null = null;
	await page.route('**/v1/posts/106/selections/91/comment-anchors', async (route) => {
		const body = route.request().postDataJSON() as { content: string };
		expect(Object.keys(body)).toEqual(['content']);
		addedContent = body.content;
		await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 901 } } });
	});
	await page.route('**/v1/posts/106/comment-anchors', async (route) => {
		if (route.request().method() === 'POST') {
			submitted = route.request().postDataJSON() as PostCommentAnchorCreateRequest;
			await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 900 } } });
			return;
		}
		await route.fulfill({
			json: {
				status: 0,
				message: 'OK',
				data: {
					blocks: submitted
						? [
								{
									blockId: submitted.blockId,
									anchorGroups: [
										{
											selectionId: 91,
											range: { startOffset: submitted.startOffset, endOffset: submitted.endOffset },
											selectedText: submitted.selectedText,
											state: 'ACTIVE',
											anchorCount: addedContent ? 2 : 1,
											commentAnchors: [submitted.content, ...(addedContent ? [addedContent] : [])].map(
												(content, index) => ({
													commentAnchorId: 900 + index,
													content,
													author: {
														userId: 1,
														nickname: '테스트 작성자',
														slug: 'author',
														profileImageUrl: null,
														isPostAuthor: false,
														isBlogMember: false,
													},
													canEdit: true,
													canDelete: true,
													createdAt: '2026-09-27T07:47:07.958Z',
													updatedAt: '2026-09-27T07:47:07.958Z',
												}),
											),
										},
									],
								},
							]
						: [],
				},
			},
		});
	});
	await page.goto('/@gustn99/posts/106');
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	const { text: selectedText } = await dragText(page);
	expect(selectedText.trim()).not.toBe('');
	const toolbarButton = page.getByRole('button', { name: '댓글 추가', exact: true });
	await expect.poll(async () => (await toolbarButton.boundingBox())?.width).toBe(28);
	await expect(toolbarButton.getByText('댓글 추가')).toHaveCSS('opacity', '0');
	const selectionEnd = await page.evaluate(() => {
		const rects = Array.from(window.getSelection()!.getRangeAt(0).getClientRects()).filter(
			(rect) => rect.width > 0 && rect.height > 0,
		);
		const rect = rects[rects.length - 1];
		return { right: rect.right, bottom: rect.bottom };
	});
	await expect.poll(async () => (await toolbarButton.boundingBox())?.x).toBeCloseTo(selectionEnd.right - 4, 0);
	await expect.poll(async () => (await toolbarButton.boundingBox())?.y).toBeCloseTo(selectionEnd.bottom - 4, 0);
	await page.evaluate(() => window.scrollBy({ top: 40, behavior: 'instant' }));
	await expect.poll(async () => (await toolbarButton.boundingBox())?.y).toBeCloseTo(selectionEnd.bottom - 4 - 40, 0);
	await toolbarButton.hover();
	await expect.poll(async () => (await toolbarButton.boundingBox())?.width).toBe(88);
	await expect(toolbarButton.getByText('댓글 추가')).toHaveCSS('opacity', '1');
	await toolbarButton.click();
	await expect(page.getByRole('region', { name: `"${selectedText}" 새 댓글` })).toBeVisible();
	const input = page.getByRole('textbox', { name: '댓글 입력' });
	await expect(input).toBeFocused();
	await input.fill('브라우저에서 작성 중인 초안');
	await page.mouse.click(8, 400);
	await expect(page.getByRole('dialog')).toBeHidden();
	await dragText(page);
	await page.getByRole('button', { name: '댓글 추가', exact: true }).click();
	await expect(input).toHaveValue('브라우저에서 작성 중인 초안');
	await page.getByRole('button', { name: '작성', exact: true }).click();
	await expect(page.getByRole('article', { name: '테스트 작성자님의 댓글' })).toContainText(
		'브라우저에서 작성 중인 초안',
	);
	expect(submitted).toMatchObject({ selectedText, content: '브라우저에서 작성 중인 초안' });
	await expect(input).toHaveValue('');
	await input.fill('같은 스레드에 추가한 댓글');
	await page.getByRole('button', { name: '작성', exact: true }).click();
	await expect(page.getByRole('article', { name: '테스트 작성자님의 댓글' })).toHaveCount(2);
	await expect(page.getByText('같은 스레드에 추가한 댓글', { exact: true })).toBeVisible();
	await expect(page.getByRole('dialog', { name: '인라인 댓글 2' })).toBeVisible();
	await expect(input).toHaveValue('');
});

test('모바일에서 본문을 선택해도 댓글 입력 툴바를 표시하지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/@gustn99/posts/106');
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	const { text } = await dragText(page);
	expect(text.trim()).not.toBe('');
	await expect(page.getByRole('toolbar', { name: '인라인 댓글' })).toHaveCount(0);
});
