import { expect, test } from '@playwright/test';

import { mockCologSettingsAccess } from './fixtures/colog-settings-access';

test.describe('팀 프로필 설정', () => {
	test.beforeEach(async ({ page }) => {
		await mockCologSettingsAccess(page);
	});

	test('설정 탭 query가 없으면 프로필 탭으로 이동한다', async ({ page }) => {
		await page.goto('/@rilog/settings');

		await expect(page).toHaveURL('/@rilog/settings?tab=profile');
		await expect(page.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
	});

	test('OWNER가 코로그 홈의 설정 버튼으로 기본 설정 탭에 이동한다', async ({ page }) => {
		await page.goto('/@rilog-e2e');
		const settingsButton = page.getByRole('link', { name: '코로그 설정' });
		const heading = page.getByRole('heading', { name: '리로그 E2E' });
		await expect(settingsButton).toBeVisible();
		const buttonBox = await settingsButton.boundingBox();
		const headingBox = await heading.boundingBox();
		const buttonRight = (buttonBox?.x ?? 0) + (buttonBox?.width ?? 0);
		const headingRight = (headingBox?.x ?? 0) + (headingBox?.width ?? 0);
		expect(Math.abs((buttonBox?.y ?? 0) - (headingBox?.y ?? 0))).toBeLessThanOrEqual(1);
		expect(Math.abs(buttonRight - headingRight)).toBeLessThanOrEqual(1);
		expect(buttonBox?.height).toBe(28);
		const initialBackground = await settingsButton.evaluate((element) => getComputedStyle(element).backgroundColor);
		expect(initialBackground).toBe('rgba(0, 0, 0, 0)');
		expect(await settingsButton.evaluate((element) => getComputedStyle(element).borderWidth)).toBe('0px');
		await settingsButton.hover();
		await expect
			.poll(() => settingsButton.evaluate((element) => getComputedStyle(element).backgroundColor))
			.not.toBe(initialBackground);
		await expect(page.locator('[role="tooltip"]')).toHaveCSS('opacity', '1');

		await settingsButton.click();

		await expect(page).toHaveURL('/@rilog-e2e/settings?tab=profile');
	});

	test('잘못된 설정 탭 query는 프로필 탭으로 이동한다', async ({ page }) => {
		await page.goto('/@rilog/settings?tab=mebers');

		await expect(page).toHaveURL('/@rilog/settings?tab=profile');
		await expect(page.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
	});

	test('프로필 탭과 조회한 팀 프로필을 기본으로 제공한다', async ({ page }) => {
		await page.goto('/@rilog/settings?tab=profile');

		await expect(page.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('textbox', { name: '팀 이름' })).toHaveValue('리로그');
		await expect(page.getByRole('textbox', { name: '팀 고유 아이디' })).toHaveValue('rilog');
		await expect(page.getByRole('button', { name: '변경사항 저장' })).toHaveCount(0);
	});

	test('프로필을 저장하면 탭을 왕복해도 저장값을 유지한다', async ({ page }) => {
		await page.goto('/@rilog/settings?tab=profile');

		const nameInput = page.getByRole('textbox', { name: '팀 이름' });
		await nameInput.fill('새 리로그');
		await expect(page.getByRole('button', { name: '변경사항 저장' })).toBeEnabled();
		await page.getByRole('button', { name: '팀 이름 중복 확인' }).click();
		await expect(nameInput).toHaveAccessibleDescription(/사용가능/);
		const saveRequest = page.waitForRequest('**/v1/cologs/rilog/profiles');
		await page.getByRole('button', { name: '변경사항 저장' }).click();
		const request = await saveRequest;
		expect(request.method()).toBe('PATCH');
		expect(request.postDataJSON()).toMatchObject({
			name: '새 리로그',
			profileImageUrl: 'https://images.rilog.test/profile.png',
			coverImageUrl: null,
			introduction: 'E2E 팀 소개',
		});
		await expect(page.getByRole('button', { name: '변경사항 저장' })).toHaveCount(0);
		await page.getByRole('tab', { name: '멤버 관리' }).click();
		await page.getByRole('tab', { name: '프로필' }).click();

		await expect(page.getByRole('textbox', { name: '팀 이름' })).toHaveValue('새 리로그');
		await expect(page.getByRole('button', { name: '변경사항 저장' })).toHaveCount(0);
	});

	test('저장하지 않은 프로필의 탭 이동을 취소하거나 확정한다', async ({ page }) => {
		await page.goto('/@rilog/settings?tab=profile');

		await page.getByRole('textbox', { name: '팀 이름' }).fill('수정 중인 리로그');
		await page.getByRole('tab', { name: '멤버 관리' }).click();

		const leaveDialog = page.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' });
		await expect(leaveDialog).toContainText('수정 중인 설정은 저장되지 않습니다.');
		await leaveDialog.getByRole('button', { name: '계속 수정' }).click();
		await expect(page.getByRole('textbox', { name: '팀 이름' })).toHaveValue('수정 중인 리로그');

		await page.getByRole('tab', { name: '멤버 관리' }).click();
		await page.getByRole('button', { name: '이동' }).click();
		await expect(page.getByRole('heading', { name: '멤버 관리' })).toBeVisible();
	});

	test('모바일 화면에서 가로로 넘치지 않는다', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/@rilog/settings?tab=members');

		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	});

	test('MEMBER가 설정 URL에 직접 접근하면 코로그 홈으로 이동한다', async ({ page }) => {
		await mockCologSettingsAccess(page, 'MEMBER');

		await page.goto('/@rilog/settings?tab=profile');

		await expect(page.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeVisible();
		await page.getByRole('button', { name: '확인' }).click();
		await expect(page).toHaveURL('/@rilog');
		await expect(page.getByRole('tab', { name: '프로필' })).not.toBeAttached();
	});

	test('코로그에 속하지 않은 사용자가 설정 URL에 직접 접근하면 코로그 홈으로 이동한다', async ({ page }) => {
		await mockCologSettingsAccess(page, null);

		await page.goto('/@rilog/settings?tab=profile');

		await expect(page.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeVisible();
		await page.getByRole('button', { name: '확인' }).click();
		await expect(page).toHaveURL('/@rilog');
		await expect(page.getByRole('tab', { name: '프로필' })).not.toBeAttached();
	});
});
