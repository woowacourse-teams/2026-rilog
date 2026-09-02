import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import {
	PROXY_AUTH_REQUIRED_NOTICE,
	PROXY_NOTICE_QUERY_KEY,
	PROXY_SESSION_COOKIE_NAME,
	PROXY_SESSION_COOKIE_VALUE,
} from '@/shared/api/proxy/constants';

import { config, proxy } from './proxy';

const createRequest = (pathname: string, proxySession?: string) =>
	new NextRequest(`https://rilog.test${pathname}`, {
		headers: proxySession ? { cookie: `${PROXY_SESSION_COOKIE_NAME}=${proxySession}` } : undefined,
	});

describe('proxy', () => {
	it('인증이 필요한 페이지 경로만 matcher에 포함한다', () => {
		expect(config.matcher).toEqual([
			'/write/:path*',
			'/colog/create/:path*',
			'/:slug/settings/:path*',
			'/sign-up/:path*',
		]);
	});

	it('proxy session이 있으면 요청을 통과시킨다', () => {
		const response = proxy(createRequest('/write', PROXY_SESSION_COOKIE_VALUE));

		expect(response.headers.get('x-middleware-next')).toBe('1');
	});

	it.each(['/write', '/colog/create', '/@rilog/settings', '/sign-up'])(
		'proxy session이 없으면 %s 요청을 인증 안내가 포함된 피드로 이동시킨다',
		(pathname) => {
			const response = proxy(createRequest(pathname));

			expect(response.status).toBe(307);
			expect(response.headers.get('location')).toBe(
				`https://rilog.test/feeds?${PROXY_NOTICE_QUERY_KEY}=${PROXY_AUTH_REQUIRED_NOTICE}`,
			);
		},
	);

	it('알 수 없는 proxy session 값은 인증 상태로 취급하지 않는다', () => {
		const response = proxy(createRequest('/write', 'manipulated'));

		expect(response.status).toBe(307);
	});
});
