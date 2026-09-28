import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { renderInlineCommentWorkspace } from './fixtures/inline-comment-browser';

const POST_DETAIL_LAYOUT_STYLES = new URL('../../widgets/post-detail/PostDetail.module.css', import.meta.url);

const renderLayoutFixture = async (page: Page) => {
	const styles = await readFile(POST_DETAIL_LAYOUT_STYLES, 'utf8');
	await page.setContent(`
		<div class="postDetailCard">
			<div class="contentLayout">
				<aside class="tableOfContentsColumn"><div class="tableOfContentsSticky">목차</div></aside>
				<article class="articleColumn">
					<hr />
					<div class="compactCommentsEntry"><button>전체 댓글 <span>8</span></button></div>
					<div class="profileSection">프로필</div>
				</article>
				<aside class="commentsColumn"><div class="commentsSticky">전체 댓글 8</div></aside>
			</div>
		</div>
	`);
	await page.addStyleTag({ content: styles });
};

test.describe('게시글 상세 사이드 레이아웃', () => {
	test('넓은 화면에서는 목차·본문·댓글 영역이 겹치지 않고 순서대로 보인다', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await renderLayoutFixture(page);

		const toc = page.locator('.tableOfContentsColumn');
		const article = page.locator('.articleColumn');
		const comments = page.locator('.commentsColumn');
		await expect(toc).toBeVisible();
		await expect(comments).toBeVisible();
		const tocBox = (await toc.boundingBox())!;
		const articleBox = (await article.boundingBox())!;
		const commentsBox = (await comments.boundingBox())!;
		expect(tocBox.x + tocBox.width).toBeLessThanOrEqual(articleBox.x);
		expect(articleBox.x + articleBox.width).toBeLessThanOrEqual(commentsBox.x);
		await expect(page.locator('.compactCommentsEntry')).toBeHidden();
	});

	test('좁은 화면에서 사이드 영역이 사라져도 전체 댓글 버튼에 접근할 수 있다', async ({ page }) => {
		await page.setViewportSize({ width: 900, height: 800 });
		await renderLayoutFixture(page);

		await expect(page.locator('.tableOfContentsColumn')).toBeHidden();
		await expect(page.locator('.commentsColumn')).toBeHidden();
		await expect(page.getByRole('button', { name: '전체 댓글 8' })).toBeVisible();
	});
});

// 실제 dialog의 모바일 접근·Escape·focus 복원은 jsdom으로 검증할 수 없다.
test('모바일에서 전체 댓글을 열고 Escape로 닫으면 진입점으로 focus가 돌아온다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.route('**/v1/**', (route) => route.abort());
	await page.route('**/v1/posts/106/comment-anchors{,/sidebar}', (route) =>
		route.fulfill({
			json: {
				status: 200,
				message: 'OK',
				data: route.request().url().endsWith('/sidebar') ? { anchorGroups: [] } : { blocks: [] },
			},
		}),
	);
	await renderInlineCommentWorkspace(page);
	const entry = page.getByRole('button', { name: '전체 댓글 0개 보기' }).filter({ visible: true }).first();
	await entry.click();
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('표시할 댓글이 없습니다.')).toBeVisible();
	const close = dialog.getByRole('button', { name: '댓글 사이드바 닫기' });
	await expect(close).toBeInViewport();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(entry).toBeFocused();
});
