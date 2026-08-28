import { expect, test } from '@playwright/test';

import { mockRilogSettingsAccess } from './fixtures/rilog-settings-access';

test.describe('개인 프로필 설정', () => {
	test('본인은 설정 버튼과 프로필·위험 영역을 사용하고 mock 저장은 API 요청을 만들지 않는다', async ({ page }) => {
		await mockRilogSettingsAccess(page, 'jetproc');
		const mutationRequests: string[] = [];
		page.on('request', (request) => {
			if (request.method() === 'PATCH' || /\/v1\/(uploads|users\/.*withdraw)/.test(new URL(request.url()).pathname)) {
				mutationRequests.push(request.url());
			}
		});

		await page.goto('/@jetproc');
		await page.getByRole('link', { name: '개인 설정' }).click();
		await expect(page).toHaveURL('/@jetproc/settings?tab=profile');
		await expect(page.getByRole('textbox', { name: '닉네임' })).toHaveValue('리로거');
		await expect(page.getByText('커버 이미지')).toHaveCount(0);

		const nickname = page.getByRole('textbox', { name: '닉네임' });
		await nickname.fill('새 리로거');
		await page.getByRole('button', { name: '닉네임 중복 확인' }).click();
		await page.getByRole('button', { name: '변경사항 저장' }).click();
		await expect(page.getByRole('button', { name: '변경사항 저장' })).toHaveCount(0);
		await page.getByRole('tab', { name: '위험 영역' }).click();
		await page.getByRole('tab', { name: '프로필' }).click();
		await expect(nickname).toHaveValue('새 리로거');
		expect(mutationRequests).toEqual([]);
	});

	test('타인은 개인 설정 URL에 접근하면 권한 안내 뒤 블로그 홈으로 이동한다', async ({ page }) => {
		await mockRilogSettingsAccess(page, 'another');
		await page.goto('/@jetproc/settings?tab=profile');
		await expect(page.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeVisible();
		await page.getByRole('button', { name: '확인' }).click();
		await expect(page).toHaveURL('/@jetproc');
	});
});
