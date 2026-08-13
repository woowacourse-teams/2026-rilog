import { expect, test } from '@playwright/test';

test('홈 화면에 서비스 정보를 표시한다', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Rilog/);
	await expect(page.getByRole('heading', { name: 'Rilog' })).toBeVisible();
	await expect(page.getByRole('main').getByText('기록을 작성하고 함께 나누는 공간')).toBeVisible();
});

test('공통 푸터를 화면 하단에 표시하고 키보드로 탐색할 수 있다', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');

	const footer = page.getByRole('contentinfo');
	await expect(footer).toBeVisible();
	await expect(footer).toHaveCount(1);

	const footerBox = await footer.boundingBox();
	expect(footerBox).not.toBeNull();
	expect(Math.round((footerBox?.y ?? 0) + (footerBox?.height ?? 0))).toBe(900);

	const links = [
		page.getByRole('link', { name: 'Rilog 홈' }),
		page.getByRole('link', { name: '개인정보처리방침' }),
		page.getByRole('link', { name: '이용약관' }),
		page.getByRole('link', { name: 'Rilog 이메일 문의' }),
		page.getByRole('link', { name: 'Rilog Google Form 문의' }),
		page.getByRole('link', { name: 'Rilog Instagram' }),
		page.getByRole('link', { name: 'Rilog Threads' }),
	];

	for (const link of links) {
		await page.keyboard.press('Tab');
		await expect(link).toBeFocused();
	}
});

test('작은 화면에서도 푸터가 가로 스크롤을 만들지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await page.goto('/');

	await expect(page.getByRole('contentinfo')).toBeVisible();
	const hasHorizontalOverflow = await page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
	);

	expect(hasHorizontalOverflow).toBe(false);
});
