import { expect, test } from '@playwright/test';

import type { Response } from '@playwright/test';

test('기존 사용자는 로그인 버튼과 OAuth 왕복 후 원래 페이지로 돌아오고 새 토큰으로 내 정보를 조회한다', async ({
	page,
}) => {
	const origin = new URL(test.info().project.use.baseURL ?? 'http://localhost:3000').origin;
	const headers = {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Allow-Headers': 'authorization,content-type',
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Expose-Headers': 'Authorization',
	};
	const myInfoTokens: (string | undefined)[] = [];
	let callbackSessionCleared: Promise<Response> | undefined;
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	await page.route('**/*', (route) =>
		new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
	);
	await page.route('**/v1/auth/token/refresh', (route) => route.fulfill({ status: 401, headers }));
	await page.route('**/v1/posts/count', (route) => route.fulfill({ headers, json: { data: { totalPostsCount: 0 } } }));
	await page.route('**/v1/feeds/posts?*', (route) =>
		route.fulfill({ headers, json: { data: { posts: [], page: 0, size: 12, numberOfElements: 0, hasNext: false } } }),
	);
	await page.route(
		(url) => url.pathname === '/v1/auth/github',
		async (route) => {
			// 정상 응답 순서를 고정한다. 초기 refresh와 callback의 경합은 별도 검증 대상이다.
			callbackSessionCleared = page.waitForResponse(
				(response) => response.url().endsWith('/api/auth/proxy-session') && response.request().method() === 'DELETE',
			);
			await route.fulfill({
				status: 302,
				headers: { location: `${origin}/auth/github/callback?code=test-code&state=test-state` },
			});
		},
	);
	await page.route('**/v1/auth/github/callback', async (route) => {
		if (route.request().method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		await callbackSessionCleared;
		await route.fulfill({
			headers: { ...headers, Authorization: 'Bearer returning-access-token' },
			json: { status: 200, message: '로그인 성공', data: { onboardingStatus: 'COMPLETED', redirectUrl: '/' } },
		});
	});
	await page.route('**/v1/users/me', async (route) => {
		if (route.request().method() === 'OPTIONS') {
			await route.fulfill({ status: 204, headers });
			return;
		}
		myInfoTokens.push(route.request().headers().authorization);
		await route.fulfill({
			headers,
			json: {
				status: 200,
				message: '조회 성공',
				data: { id: 42, slug: 'returning-user', nickname: '기존 사용자', profileImageUrl: null },
			},
		});
	});
	const initialSessionCleared = page.waitForResponse(
		(response) => response.url().endsWith('/api/auth/proxy-session') && response.request().method() === 'DELETE',
	);
	await page.goto('/feeds?category=TECH');
	await initialSessionCleared;
	await page.getByRole('button', { name: '이 업데이트 다시 보지 않기' }).click();
	await page
		.getByRole('complementary', { name: '사이드바' })
		.getByRole('button', { name: '로그인', exact: true })
		.click();
	await page.getByRole('button', { name: 'GitHub로 계속하기' }).click();
	await expect.poll(() => myInfoTokens).toEqual(['Bearer returning-access-token']);
	await expect(page).toHaveURL(`${origin}/feeds?category=TECH`);
	expect(await page.evaluate(() => localStorage.getItem('postLoginRedirect'))).toBeNull();
	expect(await page.evaluate(() => sessionStorage.getItem('rilog:sign-up-flow'))).toBeNull();
	expect(pageErrors).toEqual([]);
});
