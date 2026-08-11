import { expect, test } from '@playwright/test';

test('홈 화면에 서비스 정보를 표시한다', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Rilog/);
	await expect(page.getByRole('heading', { name: 'Rilog' })).toBeVisible();
	await expect(page.getByText('기록을 작성하고 함께 나누는 공간')).toBeVisible();
});
