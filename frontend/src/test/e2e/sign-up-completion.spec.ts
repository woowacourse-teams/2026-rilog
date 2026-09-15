import { expect, test } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

test('회원가입 완료 후 이동이 지연되어도 제한 모달 없이 피드로 이동하고 재진입은 제한한다', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
	const origin = new URL(baseURL).origin;
	const corsHeaders = {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'authorization,content-type',
		'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
	};
	const respond = async (route: Parameters<Parameters<typeof page.route>[1]>[0], body: unknown) => {
		if (route.request().method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: corsHeaders });
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			headers: corsHeaders,
			body: JSON.stringify(body),
		});
	};

	await page.route('**/*', (route) => {
		const requestOrigin = new URL(route.request().url()).origin;
		return requestOrigin === origin ? route.continue() : route.abort();
	});
	await page.route('**/v1/auth/token/refresh', (route) =>
		route.fulfill({
			status: 200,
			headers: {
				...corsHeaders,
				Authorization: 'Bearer e2e-access-token',
				'Access-Control-Expose-Headers': 'Authorization',
			},
			body: '{}',
		}),
	);
	await page.route('**/v1/users/me', (route) =>
		respond(route, {
			status: 200,
			message: '내 정보 조회 성공',
			data: { id: 1, slug: 'rilogtest', nickname: '리로그', profileImageUrl: null },
		}),
	);
	await page.route('**/v1/availability/nickname?*', (route) =>
		respond(route, { status: 200, message: '사용가능한 닉네임입니다.', data: null }),
	);
	await page.route('**/v1/availability/slug?*', (route) =>
		respond(route, { status: 200, message: '사용가능한 고유 아이디입니다.', data: null }),
	);
	await page.route('**/v1/users/me/onboarding', (route) =>
		respond(route, { status: 200, message: '회원가입 성공', data: null }),
	);
	await page.route(
		(url) => url.origin === origin && url.pathname === '/',
		async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.continue();
		},
	);

	await page
		.context()
		.addCookies([{ name: PROXY_SESSION_COOKIE_NAME, value: PROXY_SESSION_COOKIE_VALUE, url: origin }]);
	await page.goto('/about');
	await page.evaluate(() => sessionStorage.setItem('rilog:sign-up-flow', 'pending'));
	await page.goto('/sign-up');
	await expect(page.getByRole('textbox', { name: '닉네임' })).toBeVisible();

	let restrictionModalCount = 0;
	await page.exposeFunction('recordRestrictionModal', () => {
		restrictionModalCount += 1;
	});
	await page.evaluate(() => {
		const record = (window as unknown as { recordRestrictionModal: () => void }).recordRestrictionModal;
		new MutationObserver(() => {
			if (
				document.querySelector('dialog[role="alertdialog"]')?.textContent?.includes('회원가입을 진행할 수 없습니다.')
			) {
				void record();
			}
		}).observe(document.body, { childList: true, subtree: true });
	});

	await page.getByRole('textbox', { name: '닉네임' }).fill('리로그');
	await page.getByRole('textbox', { name: '고유 아이디' }).fill('rilogtest');
	await page.getByRole('button', { name: '닉네임 중복 확인' }).click();
	await page.getByRole('button', { name: '고유 아이디 중복 확인' }).click();
	await page.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' }).check();
	await Promise.all([
		(async () => {
			await page.getByRole('status').filter({ hasText: '회원가입을 완료하고 이동하고 있습니다...' }).waitFor();
			await page.screenshot({ path: test.info().outputPath('sign-up-completed.png') });
		})(),
		page.getByRole('button', { name: '시작하기' }).click(),
	]);

	await expect(page).toHaveURL(/\/feeds$/);
	await page.screenshot({ path: test.info().outputPath('sign-up-feeds.png') });
	expect(restrictionModalCount).toBe(0);
	expect(await page.evaluate(() => sessionStorage.getItem('rilog:sign-up-flow'))).toBeNull();

	await page.goto('/sign-up');
	await expect(page.getByRole('alertdialog', { name: '회원가입을 진행할 수 없습니다.' })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('sign-up-reentry.png') });
	expect(pageErrors).toEqual([]);
});
