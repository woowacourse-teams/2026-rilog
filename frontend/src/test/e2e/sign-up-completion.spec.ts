import { expect, test } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

test('회원가입 완료 후 이동이 지연되어도 제한 모달 없이 피드로 이동하고 재진입은 제한한다', async ({ page }) => {
	const pageErrors: string[] = [];
	const myInfoTokens: (string | undefined)[] = [];
	let hasCompletedSignUp = false;
	page.on('pageerror', (error) => pageErrors.push(error.message));
	const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
	const origin = new URL(baseURL).origin;
	const corsHeaders = {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'authorization,content-type',
		'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
		'Access-Control-Expose-Headers': 'Authorization',
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
			status: hasCompletedSignUp ? 200 : 401,
			headers: {
				...corsHeaders,
				...(hasCompletedSignUp ? { Authorization: 'Bearer e2e-access-token' } : {}),
			},
			body: '{}',
		}),
	);
	// 초기 인증 복구와 콜백의 경합은 별도 검증하고, 여기서는 정상 순서를 재현한다.
	const initialSessionCleared = page.waitForResponse(
		(response) => response.url().endsWith('/api/auth/proxy-session') && response.request().method() === 'DELETE',
	);
	await page.route('**/v1/auth/github/callback', async (route) => {
		if (route.request().method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: corsHeaders });
			return;
		}
		await initialSessionCleared;
		await route.fulfill({
			headers: { ...corsHeaders, Authorization: 'Bearer e2e-onboarding-token' },
			json: { status: 200, message: '로그인 성공', data: { onboardingStatus: 'PENDING', redirectUrl: '/sign-up' } },
		});
	});
	await page.route('**/v1/users/me', (route) => {
		if (route.request().method() !== 'OPTIONS') {
			myInfoTokens.push(route.request().headers().authorization);
		}
		return respond(route, {
			status: 200,
			message: '내 정보 조회 성공',
			data: { id: 1, slug: 'rilogtest', nickname: '리로그', profileImageUrl: null },
		});
	});
	await page.route('**/v1/availability/nickname?*', (route) =>
		respond(route, { status: 200, message: '사용가능한 닉네임입니다.', data: null }),
	);
	await page.route('**/v1/availability/slug?*', (route) =>
		respond(route, { status: 200, message: '사용가능한 고유 아이디입니다.', data: null }),
	);
	await page.route('**/v1/users/me/onboarding', async (route) => {
		if (route.request().method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers: corsHeaders });
			return;
		}
		expect(route.request().headers().authorization).toBe('Bearer e2e-onboarding-token');
		hasCompletedSignUp = true;
		await route.fulfill({
			headers: { ...corsHeaders, Authorization: 'Bearer e2e-access-token' },
			json: { status: 200, message: '회원가입 성공', data: null },
		});
	});
	await page.route(
		(url) => url.origin === origin && url.pathname === '/',
		async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.continue();
		},
	);

	await page.goto('/auth/github/callback?code=e2e-code&state=e2e-state');
	await expect(page).toHaveURL(/\/sign-up$/);
	await expect(page.getByRole('textbox', { name: '닉네임' })).toBeVisible();
	expect(myInfoTokens).toEqual([]);
	expect(await page.context().cookies()).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ name: PROXY_SESSION_COOKIE_NAME, value: PROXY_SESSION_COOKIE_VALUE }),
		]),
	);

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
	await expect.poll(() => myInfoTokens).toEqual(['Bearer e2e-access-token']);
	await page.screenshot({ path: test.info().outputPath('sign-up-feeds.png') });
	expect(restrictionModalCount).toBe(0);
	expect(await page.evaluate(() => sessionStorage.getItem('rilog:sign-up-flow'))).toBeNull();

	await page.goto('/sign-up');
	await expect(page.getByRole('alertdialog', { name: '회원가입을 진행할 수 없습니다.' })).toBeVisible();
	await page.screenshot({ path: test.info().outputPath('sign-up-reentry.png') });
	expect(pageErrors).toEqual([]);
});
