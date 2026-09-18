import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

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
	test('넓은 화면에서는 목차를 좌측, 전체 댓글을 우측 sticky 영역에 배치한다', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await renderLayoutFixture(page);

		await expect(page.locator('.tableOfContentsColumn')).toHaveCSS('display', 'block');
		await expect(page.locator('.tableOfContentsColumn')).toHaveCSS('grid-column-start', '1');
		await expect(page.locator('.articleColumn')).toHaveCSS('grid-column-start', '2');
		await expect(page.locator('.commentsColumn')).toHaveCSS('display', 'block');
		await expect(page.locator('.commentsColumn')).toHaveCSS('grid-column-start', '3');
		await expect(page.locator('.commentsColumn')).toHaveCSS('padding-top', '40px');
		await expect(page.locator('.commentsSticky')).toHaveCSS('position', 'sticky');
		await expect(page.locator('.commentsSticky')).toHaveCSS('justify-content', 'flex-end');
		await expect(page.locator('.commentsSticky')).toHaveCSS('top', '40px');
		await expect(page.locator('.compactCommentsEntry')).toBeHidden();
	});

	test('사이드 영역이 사라지면 구분선 아래 우측에 전체 댓글 버튼을 표시한다', async ({ page }) => {
		await page.setViewportSize({ width: 900, height: 800 });
		await renderLayoutFixture(page);

		await expect(page.locator('.tableOfContentsColumn')).toBeHidden();
		await expect(page.locator('.commentsColumn')).toBeHidden();
		await expect(page.locator('.compactCommentsEntry')).toHaveCSS('display', 'flex');
		await expect(page.locator('.compactCommentsEntry')).toHaveCSS('justify-content', 'flex-end');
		await expect(page.getByRole('button', { name: '전체 댓글 8' })).toBeVisible();
	});
});
