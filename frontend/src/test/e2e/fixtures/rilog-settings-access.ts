import type { Page } from '@playwright/test';

import { AUTH_REFRESH_ROUTE, mockAuthenticatedAccess, MY_INFO_ROUTE } from './authenticated-access';

const RILOG_PROFILE_ROUTE = /\/v1\/blogs\/@[^/]+$/;
const PROXY_SESSION_ROUTE = '**/api/auth/proxy-session';

export const mockRilogSettingsAccess = async (page: Page, currentUserSlug = 'rilogger') => {
	await page.unroute(AUTH_REFRESH_ROUTE);
	await page.unroute(PROXY_SESSION_ROUTE);
	await page.unroute(MY_INFO_ROUTE);
	await page.unroute(RILOG_PROFILE_ROUTE);
	await page.request.post('http://localhost:3000/api/auth/proxy-session');
	await mockAuthenticatedAccess(page);

	await page.unroute(MY_INFO_ROUTE);
	await page.route(MY_INFO_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '내 정보 조회에 성공했습니다.',
				data: { id: 1, slug: currentUserSlug, nickname: 'E2E 사용자', profileImageUrl: null },
			}),
		}),
	);

	await page.route(RILOG_PROFILE_ROUTE, (route) => {
		const pathname = new URL(route.request().url()).pathname;
		const slug = decodeURIComponent(pathname.slice(pathname.lastIndexOf('@') + 1));

		return route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '개인 공개 프로필 조회에 성공했습니다.',
				data: {
					type: 'RILOG',
					id: 1,
					name: '리로거',
					slug,
					introduction: '기록하고 성장하는 개발자입니다.',
					profileImageUrl: null,
					coverImageUrl: null,
					serviceUrl: 'https://rilog.kr',
					githubUrl: 'https://github.com/rilog',
					memberCount: 1,
					postCount: 0,
				},
			}),
		});
	});
};
