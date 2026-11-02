import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import type { PostCommentAnchorResponse, PostCommentAnchorSidebarGroupResponse } from '@/shared/api/posts/types';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

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

const openOwnedComments = async (page: Page, width = 1100, open = true) => {
	await page.setViewportSize({ width, height: 900 });
	const group = createComposerThreadGroup(91, 'Rilog', 0, { canDelete: true, canEdit: true });
	await page.route('https://api.rilog.test/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/comment-anchors/sidebar'))
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [group] } } });
		else if (path.endsWith('/comment-anchors'))
			await route.fulfill({
				json: { status: 200, message: 'OK', data: { blocks: [{ blockId: 'article-101', anchorGroups: [group] }] } },
			});
		else if (path.endsWith('/history')) await route.fulfill({ status: 204 });
		else await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
	});
	await mockAuthenticatedAccess(page);
	await page.goto('/@the_rilog/posts/101');
	const entry = page.getByRole('button', { name: /전체 댓글.*보기/ });
	await expect(entry).toBeVisible();
	await expect(entry).toContainText(width >= 1440 ? '전체 보기' : '전체 댓글');
	await expect(page.getByRole('button', { name: '댓글 작성', exact: true })).toHaveCount(0);
	if (open) await entry.click();
};

test('PC 스티키 레이아웃이 해제되면 플로팅 버튼으로 댓글을 연다', async ({ page }) => {
	await openOwnedComments(page, 1440, false);
	const original = page.getByRole('button', { name: /전체 댓글.*보기/ }).filter({ hasText: '전체 보기' });
	const floating = page.getByRole('button', { name: /전체 댓글.*보기/ }).filter({ hasText: '전체 댓글' });
	await expect(original).toBeVisible();
	await expect(floating).toHaveCount(0);
	await page.setViewportSize({ width: 1100, height: 900 });
	await expect(original).toHaveCount(0);
	await expect(floating).toBeVisible();
	await floating.click();
	await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 1' })).toBeVisible();
	await page.goBack();
	await expect(floating).toBeVisible();
	await page.setViewportSize({ width: 1440, height: 900 });
	await expect(original).toBeVisible();
	await expect(floating).toHaveCount(0);
});

test('도킹 댓글창을 닫고 늦게 수정이 실패해도 숨은 오류 모달이 열리지 않는다', async ({ page }) => {
	await openOwnedComments(page, 1440);
	const pending = Promise.withResolvers<void>();
	await page.route('**/v1/posts/101/comment-anchors/991', async (route) => {
		await pending.promise;
		await route.fulfill({ status: 400, json: { status: 400, message: '실패', data: null } });
	});
	const panel = page.getByRole('region', { name: '전체 인라인 댓글 1', exact: true });
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: '수정', exact: true }).click();
	await panel.getByRole('textbox', { name: '댓글 수정' }).fill('닫은 뒤에도 남길 수정 초안');
	const requested = page.waitForRequest((request) => request.method() === 'PATCH');
	await panel.getByRole('button', { name: '저장', exact: true }).click();
	await requested;
	await panel.getByRole('button', { name: '댓글 사이드바 닫기' }).click();
	await expect(panel).toBeHidden();
	const response = page.waitForResponse((item) => item.request().method() === 'PATCH');
	pending.resolve();
	await response;
	await page.getByRole('button', { name: /전체 댓글.*보기/ }).click();
	await expect(page.getByRole('textbox', { name: '댓글 수정' })).toHaveValue('닫은 뒤에도 남길 수정 초안');
	await expect(page.locator('dialog:modal')).toHaveCount(0);
});

test('삭제 확인창에서 뒤로가기로 댓글창을 닫으면 본문을 다시 클릭할 수 있다', async ({ page }) => {
	await openOwnedComments(page);
	await page.getByRole('button', { name: '삭제', exact: true }).click();
	await expect(page.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/101$/);
	await expect(page.locator('dialog:modal')).toHaveCount(0);
	await page.getByRole('button', { name: /전체 댓글.*보기/ }).click();
	await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 1' })).toBeVisible();
});

for (const method of ['PATCH', 'DELETE'] as const) {
	test(`${method} 요청 중 뒤로가고 나중에 실패해도 숨은 오류 모달이 열리지 않는다`, async ({ page }) => {
		await openOwnedComments(page);
		const pending = Promise.withResolvers<void>();
		await page.route('**/v1/posts/101/comment-anchors/991', async (route) => {
			await pending.promise;
			await route.fulfill({ status: 400, json: { status: 400, message: '실패', data: null } });
		});
		const requested = page.waitForRequest((request) => request.method() === method);
		if (method === 'PATCH') {
			await page.getByRole('button', { name: '수정', exact: true }).click();
			await page.getByRole('textbox', { name: '댓글 수정' }).fill('닫은 뒤에도 남길 수정 초안');
			await page.getByRole('button', { name: '저장', exact: true }).click();
		} else {
			await page.getByRole('button', { name: '삭제', exact: true }).click();
			await page
				.getByRole('dialog', { name: '댓글을 삭제할까요?' })
				.getByRole('button', { name: '삭제', exact: true })
				.click();
		}
		await requested;
		await page.goBack();
		await expect(page.locator('dialog:modal')).toHaveCount(0);
		const response = page.waitForResponse((item) => item.request().method() === method);
		pending.resolve();
		await response;
		await page.getByRole('button', { name: /전체 댓글.*보기/ }).click();
		if (method === 'PATCH') {
			await expect(page.getByRole('textbox', { name: '댓글 수정' })).toHaveValue('닫은 뒤에도 남길 수정 초안');
			await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
		} else {
			await expect(page.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeHidden();
			await page.getByRole('button', { name: '삭제', exact: true }).click();
			const confirmation = page.getByRole('dialog', { name: '댓글을 삭제할까요?' });
			await expect(confirmation.getByRole('button', { name: '삭제', exact: true })).toBeEnabled();
			await confirmation.getByRole('button', { name: '취소', exact: true }).click();
		}
		await expect(page.locator('dialog:modal')).toHaveCount(1);
		await expect(page.getByRole('alertdialog')).toHaveCount(0);
	});
}
