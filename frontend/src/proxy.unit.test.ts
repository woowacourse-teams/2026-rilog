import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

import { config, proxy } from './proxy';

const createRequest = (pathname: string, proxySession?: string) =>
	new NextRequest(`https://rilog.test${pathname}`, {
		headers: proxySession ? { cookie: `${PROXY_SESSION_COOKIE_NAME}=${proxySession}` } : undefined,
	});

describe('proxy', () => {
	it('인증이 필요한 페이지 경로만 matcher에 포함한다', () => {
		expect(config.matcher).toEqual(['/write/:path*', '/co-logs/create/:path*', '/:slug/settings/:path*']);
	});

	it('proxy session이 있으면 요청을 통과시킨다', () => {
		const response = proxy(createRequest('/write', PROXY_SESSION_COOKIE_VALUE));

		expect(response.headers.get('x-middleware-next')).toBe('1');
	});

	it.each(['/write', '/co-logs/create', '/@rilog/settings'])(
		'proxy session이 없으면 %s 요청을 root로 이동시킨다',
		(pathname) => {
			const response = proxy(createRequest(pathname));

			expect(response.status).toBe(307);
			expect(response.headers.get('location')).toBe('https://rilog.test/');
		},
	);

	it('알 수 없는 proxy session 값은 인증 상태로 취급하지 않는다', () => {
		const response = proxy(createRequest('/write', 'manipulated'));

		expect(response.status).toBe(307);
	});
});
