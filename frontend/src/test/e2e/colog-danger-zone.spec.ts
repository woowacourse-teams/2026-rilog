import { expect, test } from '@playwright/test';

test('팀 위험 영역에서 영구 삭제의 영향을 확인하고 취소한다', async ({ page }) => {
	await page.goto('/co-logs/rilog/settings');
	await page.getByRole('tab', { name: '위험 영역' }).click();

	await expect(page.getByRole('heading', { name: '팀 삭제' })).toBeVisible();
	await expect(page.getByText(/게시글은 작성자 개인 글로 전환/)).toBeVisible();

	await page.getByRole('button', { name: '팀 영구 삭제' }).click();

	const dialog = page.getByRole('dialog', { name: '팀을 영구 삭제할까요?' });
	await expect(dialog).toContainText('삭제된 팀과 설정은 복구할 수 없습니다.');
	await expect(dialog.getByRole('button', { name: '취소' })).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
});
