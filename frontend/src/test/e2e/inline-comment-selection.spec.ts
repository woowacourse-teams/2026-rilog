import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';

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
});

test('모바일에서 본문을 선택해도 댓글 입력 툴바를 표시하지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/@gustn99/posts/106');
	await expect(page.getByRole('article', { name: '게시글 본문' })).toBeVisible();
	const { text } = await dragText(page);
	expect(text.trim()).not.toBe('');
	await expect(page.getByRole('toolbar', { name: '인라인 댓글' })).toHaveCount(0);
});
