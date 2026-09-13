import { expect, test } from '@playwright/test';

test.describe('팀 생성', () => {
	test('팀 생성 폼과 사이드바 진입점을 제공한다', async ({ page }) => {
		await page.goto('/colog/create');

		await expect(page).toHaveTitle(/팀 생성 \| Rilog/);
		await expect(page.getByRole('complementary', { name: '사이드바' })).toBeVisible();
		await expect(page.getByRole('heading', { name: '팀 생성' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: '팀 이름' })).toBeVisible();
		await expect(page.getByRole('textbox', { name: '팀 고유 아이디' })).toBeVisible();
		await expect(page.getByRole('button', { name: '팀 만들기' })).toBeVisible();
	});

	test('취소하면 이전 경로로 돌아간다', async ({ page }) => {
		await page.goto('/sign-up');
		await page.goto('/colog/create');

		await page.getByRole('button', { name: '취소' }).click();

		await expect(page).toHaveURL('/sign-up');
	});

	test('필수 입력을 검증하고 유효한 정보로 팀을 생성한다', async ({ page }) => {
		await page.goto('/colog/create');

		await page.getByRole('button', { name: '팀 만들기' }).click();
		await expect(page.getByText('팀 로고를 등록해 주세요.')).toBeVisible();
		await expect(page.getByLabel('팀 로고 변경')).toBeFocused();

		await page.getByLabel('팀 로고 변경').setInputFiles({
			name: 'rilog-logo.png',
			mimeType: 'image/png',
			buffer: Buffer.from('rilog-logo'),
		});
		await page.getByRole('textbox', { name: '팀 이름' }).fill('리로그 E2E');
		await page.getByRole('textbox', { name: '팀 고유 아이디' }).fill('rilog-e2e');
		await page.getByRole('button', { name: '팀 이름 중복 확인' }).click();
		await expect(page.getByRole('textbox', { name: '팀 이름' })).toHaveAccessibleDescription(/사용가능/);
		await page.getByRole('button', { name: '팀 고유 아이디 중복 확인' }).click();
		await expect(page.getByRole('textbox', { name: '팀 고유 아이디' })).toHaveAccessibleDescription(/사용가능/);
		await page.getByRole('button', { name: '팀 만들기' }).click();

		await expect(page).toHaveURL('/@rilog-e2e');
	});

	test('모바일 화면에서 가로로 넘치지 않는다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/colog/create');

		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	});
});
