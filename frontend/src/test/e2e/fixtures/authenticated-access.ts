import type { Page } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

export const AUTH_REFRESH_ROUTE = '**/v1/auth/token/refresh';
export const MY_INFO_ROUTE = '**/v1/users/me';

export const mockAuthenticatedAccess = async (page: Page) => {
	await page.context().addCookies([
		{
			name: PROXY_SESSION_COOKIE_NAME,
			value: PROXY_SESSION_COOKIE_VALUE,
			url: 'http://localhost:3000',
		},
	]);
	await page.route(AUTH_REFRESH_ROUTE, (route) =>
		route.fulfill({
			status: 204,
			headers: {
				Authorization: 'Bearer e2e-access-token',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': 'http://localhost:3000',
				'Access-Control-Expose-Headers': 'Authorization',
			},
		}),
	);
	await page.route(MY_INFO_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '내 정보 조회에 성공했습니다.',
				data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
			}),
		}),
	);
};
