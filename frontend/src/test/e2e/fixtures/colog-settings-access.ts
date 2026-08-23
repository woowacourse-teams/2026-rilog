import type { Page } from '@playwright/test';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

type CologPermission = 'OWNER' | 'ADMIN' | 'MEMBER';

const MY_INFO_ROUTE = '**/v1/users/me';
const COLOG_MEMBERS_ROUTE = '**/v1/cologs/*/members';
const COLOG_PROFILE_UPDATE_ROUTE = '**/v1/cologs/*/profiles';
const COLOG_PROFILE_ROUTE = /\/v1\/blogs\/@[^/]+$/;
const NICKNAME_AVAILABILITY_ROUTE = '**/v1/availability/nickname*';
const AUTH_REFRESH_ROUTE = '**/v1/auth/token/refresh';
const PROXY_SESSION_ROUTE = '**/api/auth/proxy-session';

export const mockCologSettingsAccess = async (page: Page, permission: CologPermission | null = 'OWNER') => {
	await page.context().addCookies([
		{
			name: PROXY_SESSION_COOKIE_NAME,
			value: PROXY_SESSION_COOKIE_VALUE,
			url: 'http://localhost:3000',
		},
	]);
	await page.unroute(AUTH_REFRESH_ROUTE);
	await page.unroute(PROXY_SESSION_ROUTE);
	await page.unroute(MY_INFO_ROUTE);
	await page.unroute(COLOG_MEMBERS_ROUTE);
	await page.unroute(COLOG_PROFILE_UPDATE_ROUTE);
	await page.unroute(COLOG_PROFILE_ROUTE);
	await page.unroute(NICKNAME_AVAILABILITY_ROUTE);
	await page.request.post('http://localhost:3000/api/auth/proxy-session');

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

	await page.route(NICKNAME_AVAILABILITY_ROUTE, (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ status: 200, message: '사용가능한 닉네임입니다.', data: null }),
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
