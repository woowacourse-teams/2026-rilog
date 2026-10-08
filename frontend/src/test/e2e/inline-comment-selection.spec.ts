import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';
import type { PostCommentAnchorCreateRequest } from '@/shared/api/posts/types';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';
import { renderInlineCommentWorkspace } from './fixtures/inline-comment-browser';

const dragText = async (page: Page) => {
	await expect(page.getByRole('article', { name: '게시글 본문' })).toHaveAttribute(
		'data-comment-selection-ready',
		'true',
	);
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

test('본문 선택의 초안을 복원하고 작성·수정·삭제 결과를 조회에 반영한다', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await mockAuthenticatedAccess(page);
	await page.route('**/v1/**', (route) => route.abort());

	let submitted: PostCommentAnchorCreateRequest | null = null;
	let addedContent: string | null = null;
	let isAddedEdited = false;
	const deleteGate = Promise.withResolvers<void>();
	await page.route('**/v1/posts/106/comment-anchors/901', async (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON() as { content: string };
			expect(Object.keys(body)).toEqual(['content']);
			addedContent = body.content;
			isAddedEdited = true;
			await route.fulfill({
				json: {
					status: 0,
					message: 'OK',
					data: {
						commentAnchorId: 901,
						content: addedContent,
						isEdited: true,
						createdAt: '2026-09-27T07:47:07.958Z',
						updatedAt: '2026-09-27T08:47:07.958Z',
					},
				},
			});
			return;
		}
		expect(route.request().method()).toBe('DELETE');
		await deleteGate.promise;
		expect(route.request().postData()).toBeNull();
		addedContent = null;
		await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 901, selectionId: 91 } } });
	});
	await page.route('**/v1/posts/106/selections/91/comment-anchors', async (route) => {
		const body = route.request().postDataJSON() as { content: string };
		expect(Object.keys(body)).toEqual(['content']);
		addedContent = body.content;
		await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 901 } } });
	});
	await page.route('**/v1/posts/106/comment-anchors{,/sidebar}', async (route) => {
		if (route.request().method() === 'POST') {
			submitted = route.request().postDataJSON() as PostCommentAnchorCreateRequest;
			await route.fulfill({ json: { status: 0, message: 'OK', data: { commentAnchorId: 900 } } });
			return;
		}
		const response = {
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
												isEdited: index === 1 && isAddedEdited,
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
		};
		await route.fulfill({
			json: route.request().url().endsWith('/sidebar')
				? {
						...response,
						data: {
							anchorGroups: response.data.blocks.flatMap(({ blockId, anchorGroups }) =>
								anchorGroups.map((group) => ({ ...group, blockId })),
							),
						},
					}
				: response,
		});
	});
	await renderInlineCommentWorkspace(page);
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
	await expect(page.getByRole('region', { name: `"${selectedText}" 댓글` })).toBeVisible();
	const input = page.getByRole('textbox', { name: '댓글 입력' });
	await expect(input).toBeFocused();
	await input.fill('브라우저에서 작성 중인 초안');
	await page.mouse.click(8, 400);
	const commentsPane = page.getByRole('region', { name: /^인라인 댓글 \d+$/ });
	await expect(commentsPane).toBeVisible();
	await expect(input).toHaveValue('브라우저에서 작성 중인 초안');
	await commentsPane.getByRole('button', { name: '댓글 사이드바 닫기' }).click();
	await expect(commentsPane).toBeHidden();
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
	await expect(page.getByRole('region', { name: '인라인 댓글 2', exact: true })).toBeVisible();
	await expect(input).toHaveValue('');
	const lastComment = page.getByRole('article', { name: '테스트 작성자님의 댓글' }).last();
	await lastComment.getByRole('button', { name: '수정', exact: true }).click();
	const editInput = lastComment.getByRole('textbox', { name: '댓글 수정' });
	await expect(editInput).toBeFocused();
	await editInput.fill('수정한 댓글');
	await lastComment.getByRole('button', { name: '저장', exact: true }).click();
	await expect(lastComment.getByText('수정한 댓글', { exact: true })).toBeVisible();
	await expect(lastComment.getByText('편집됨')).toBeVisible();
	await expect(lastComment.getByRole('button', { name: '수정', exact: true })).toBeFocused();
	await page
		.getByRole('article', { name: '테스트 작성자님의 댓글' })
		.last()
		.getByRole('button', { name: '삭제' })
		.click();
	await page.getByRole('dialog', { name: '댓글을 삭제할까요?' }).getByRole('button', { name: '삭제' }).click();
	const deleteDialog = page.getByRole('dialog', { name: '댓글을 삭제할까요?' });
	await expect(deleteDialog.getByRole('button', { name: '삭제 중…' })).toBeDisabled();
	await expect(deleteDialog.getByRole('button', { name: '취소' })).toBeDisabled();
	await page.keyboard.press('Escape');
	await expect(deleteDialog).toBeVisible();
	deleteGate.resolve();
	await expect(page.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeHidden();
	await expect(page.getByText('수정한 댓글', { exact: true })).toBeHidden();
	await expect(page.getByRole('article', { name: '테스트 작성자님의 댓글' })).toHaveCount(1);
	await expect(page.getByRole('region', { name: '인라인 댓글 1', exact: true })).toBeVisible();
});

test('모바일에서 본문을 선택해도 댓글 입력 툴바를 표시하지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.route('**/v1/**', (route) => route.abort());
	await page.route('**/v1/posts/106/comment-anchors{,/sidebar}', (route) =>
		route.fulfill({
			json: {
				status: 0,
				message: 'OK',
				data: route.request().url().endsWith('/sidebar') ? { anchorGroups: [] } : { blocks: [] },
			},
		}),
	);
	await renderInlineCommentWorkspace(page);
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	const { text } = await dragText(page);
	expect(text.trim()).not.toBe('');
	await expect(page.getByRole('toolbar', { name: '인라인 댓글' })).toHaveCount(0);
});
