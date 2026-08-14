import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const TEST_IMAGE_BYTES = Array.from(
	Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
);

const expectBodyImage = async (page: Page) => {
	await expect(page.locator('[data-content-type="image"] img')).toHaveAttribute('src', /^data:image\/png;base64,/);
};

test.describe('글 작성', () => {
	test('클립보드 이미지를 본문에 붙여넣는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await editor.evaluate((element, imageBytes) => {
			const clipboardData = new DataTransfer();
			clipboardData.items.add(new File([new Uint8Array(imageBytes)], 'clipboard.png', { type: 'image/png' }));
			element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
		}, TEST_IMAGE_BYTES);

		await expectBodyImage(page);
	});

	test('이미지 파일을 본문에 끌어다 놓는다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.evaluate((element, imageBytes) => {
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(new File([new Uint8Array(imageBytes)], 'dropped.png', { type: 'image/png' }));
			const bounds = element.getBoundingClientRect();
			element.dispatchEvent(
				new DragEvent('drop', {
					dataTransfer,
					bubbles: true,
					cancelable: true,
					clientX: bounds.left + 20,
					clientY: bounds.top + 20,
				}),
			);
		}, TEST_IMAGE_BYTES);

		await expectBodyImage(page);
	});

	test('이미지 블록의 파일 선택으로 이미지를 업로드한다', async ({ page }) => {
		await page.goto('/write');
		const editor = page.getByRole('textbox', { name: '게시글 내용' });
		await editor.click();
		await page.keyboard.type('/이미지');
		await page.keyboard.press('Enter');

		await page
			.getByRole('tabpanel', { name: '업로드' })
			.locator('input[type="file"]')
			.setInputFiles({
				name: 'selected.png',
				mimeType: 'image/png',
				buffer: Buffer.from(TEST_IMAGE_BYTES),
			});

		await expectBodyImage(page);
	});

	test('긴 제목은 내부 스크롤 없이 내용 높이만큼 확장된다', async ({ page }) => {
		await page.goto('/write');
		const title = page.getByRole('textbox', { name: '게시글 제목' });
		await title.fill('내용에 맞춰 아래로 계속 확장되는 긴 게시글 제목입니다. '.repeat(6));

		const { height, lineHeight, overflow, scrollHeight } = await title.evaluate((element) => ({
			height: element.clientHeight,
			lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
			overflow: getComputedStyle(element).overflowY,
			scrollHeight: element.scrollHeight,
		}));

		expect(height).toBeGreaterThan(lineHeight * 2);
		expect(height).toBeGreaterThanOrEqual(scrollHeight - 1);
		expect(overflow).toBe('hidden');
	});
});
