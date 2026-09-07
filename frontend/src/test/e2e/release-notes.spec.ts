import { expect, test } from '@playwright/test';

import { RELEASE_NOTE_STORAGE_KEY } from '@/features/release-notes/model/release-note-storage';
import { getLatestReleaseNote, RELEASE_NOTES } from '@/features/release-notes/model/release-notes';

const latestNote = getLatestReleaseNote(RELEASE_NOTES);

test.describe('업데이트 모달 ESC 정책', () => {
	test.skip(!latestNote, '공개된 업데이트가 없으면 모달을 노출하지 않는다.');

	test.beforeEach(async ({ page }) => {
		await page.goto('/feeds');
		await expect(page.getByRole('dialog')).toBeVisible();
	});

	test('연속 ESC와 키 반복은 닫기나 저장을 유발하지 않는다', async ({ page }) => {
		const dialog = page.getByRole('dialog');
		for (let index = 0; index < 5; index += 1) {
			await page.keyboard.press('Escape');
			await expect(dialog).toBeVisible();
		}
		await dialog.getByRole('heading', { level: 2 }).click();
		await page.keyboard.down('Escape');
		await page.keyboard.down('Escape');
		await page.keyboard.down('Escape');
		await page.keyboard.up('Escape');
		await page.mouse.click(1, 1);
		await expect(dialog).toBeVisible();
		expect(
			await page.evaluate((key) => [sessionStorage.getItem(key), localStorage.getItem(key)], RELEASE_NOTE_STORAGE_KEY),
		).toEqual([null, null]);
	});

	for (const name of ['닫기', '모달 닫기', '이 업데이트 다시 보지 않기']) {
		test(`${name}는 기존 저장 정책대로 닫는다`, async ({ page }) => {
			await page.getByRole('button', { name, exact: true }).click();
			await expect(page.getByRole('dialog')).not.toBeVisible();
			const stored = await page.evaluate(
				(key) => [sessionStorage.getItem(key), localStorage.getItem(key)],
				RELEASE_NOTE_STORAGE_KEY,
			);
			expect(stored).toEqual(name === '이 업데이트 다시 보지 않기' ? [null, latestNote?.id] : [latestNote?.id, null]);
			await page.reload();
			await expect(page.getByRole('heading', { name: 'Rilog', exact: true })).toBeAttached();
			await expect(page.getByRole('dialog')).not.toBeVisible();
		});
	}

	test('ESC를 허용한 인증 안내 모달은 기존대로 닫힌다', async ({ page }) => {
		await page.goto('/feeds?notice=auth-required');
		const dialog = page.getByRole('alertdialog');
		await expect(dialog).toBeVisible();
		await expect(dialog).not.toHaveAttribute('closedby');
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});
});
