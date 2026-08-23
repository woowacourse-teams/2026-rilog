import type { Page } from '@playwright/test';

import { AUTH_REFRESH_ROUTE, mockAuthenticatedAccess, MY_INFO_ROUTE } from './authenticated-access';

type CologPermission = 'OWNER' | 'ADMIN' | 'MEMBER';

const COLOG_MEMBERS_ROUTE = '**/v1/cologs/*/members';
const COLOG_PROFILE_UPDATE_ROUTE = '**/v1/cologs/*/profiles';
const COLOG_PROFILE_ROUTE = /\/v1\/blogs\/@[^/]+$/;
const PROXY_SESSION_ROUTE = '**/api/auth/proxy-session';

export const mockCologSettingsAccess = async (page: Page, permission: CologPermission | null = 'OWNER') => {
	await page.unroute(AUTH_REFRESH_ROUTE);
	await page.unroute(PROXY_SESSION_ROUTE);
	await page.unroute(MY_INFO_ROUTE);
	await page.unroute(COLOG_MEMBERS_ROUTE);
	await page.unroute(COLOG_PROFILE_UPDATE_ROUTE);
	await page.unroute(COLOG_PROFILE_ROUTE);
	await page.request.post('http://localhost:3000/api/auth/proxy-session');
	await mockAuthenticatedAccess(page);

	await page.route(COLOG_MEMBERS_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '팀 멤버 목록 조회에 성공했습니다.',
				data:
					permission === null
						? []
						: [
								{
									id: 10,
									userId: 1,
									nickname: 'E2E 사용자',
									slug: 'e2e-user',
									profileImageUrl: null,
									permission,
									blogRole: '테스터',
									joinedAt: '2026-08-20T00:00:00',
								},
							],
			}),
		}),
	);

	await page.route(COLOG_PROFILE_UPDATE_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ status: 200, message: '팀 프로필을 수정했습니다.' }),
		}),
	);

	await page.route(COLOG_PROFILE_ROUTE, (route) => {
		const pathname = new URL(route.request().url()).pathname;
		const slug = decodeURIComponent(pathname.slice(pathname.lastIndexOf('@') + 1));

		return route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				status: 200,
				message: '팀 공개 프로필 조회에 성공했습니다.',
				data: {
					type: 'COLOG',
					id: 1,
					name: slug === 'rilog-e2e' ? '리로그 E2E' : '리로그',
					slug,
					introduction: 'E2E 팀 소개',
					profileImageUrl: 'https://images.rilog.test/profile.png',
					coverImageUrl: null,
					serviceUrl: null,
					githubUrl: null,
					memberCount: 1,
					postCount: 0,
				},
			}),
		});
	});
};
