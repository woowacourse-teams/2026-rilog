import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { BASE_MODAL_CLASS_NAME } from '@/shared/ui/modal/modal.styles';

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

// RTL covers the real sidebar interactions; this checks its compiled responsive CSS in Chromium.
test('댓글 사이드바는 모바일 화면을 채우고 데스크톱에서는 우측에 배치된다', async ({ page }) => {
	await page.route('**/v1/**', (route) => route.abort());
	await page.goto('/about');
	const styles = await page
		.locator('link[rel="stylesheet"]')
		.evaluateAll((links) =>
			links.map((link) => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`).join(''),
		);
	const source = await readFile(
		new URL('../../features/post-detail/ui/PostCommentsSidebar.tsx', import.meta.url),
		'utf8',
	);
	const sidebarClass = source.match(/className="(fixed inset-y-0[^\"]+)"/)?.[1];
	expect(sidebarClass).toBeTruthy();
	await page.setContent(
		`<html><head>${styles}</head><body><dialog class="${BASE_MODAL_CLASS_NAME} ${sidebarClass}" data-state="open" aria-label="댓글 사이드바"><h2>전체 인라인 댓글</h2><button>댓글 사이드바 닫기</button></dialog></body></html>`,
	);
	await page.locator('dialog').evaluate((element: HTMLDialogElement) => element.showModal());
	await page.setViewportSize({ width: 390, height: 844 });
	const dialog = page.getByRole('dialog', { name: '댓글 사이드바' });
	await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(390);
	await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(0);
	await expect.poll(async () => (await dialog.boundingBox())?.height).toBe(844);
	await page.setViewportSize({ width: 1440, height: 900 });
	await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(448);
	await expect.poll(async () => (await dialog.boundingBox())?.x).toBe(992);
});
