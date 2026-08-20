import { describe, expect, it } from 'vitest';

import { PROXY_SESSION_COOKIE_NAME, PROXY_SESSION_COOKIE_VALUE } from '@/shared/api/proxy/constants';

import { DELETE, POST } from './route';

describe('proxy session route', () => {
	it('proxy session cookie를 HttpOnly session cookie로 등록한다', () => {
		const response = POST();
		const setCookie = response.headers.get('set-cookie');

		expect(response.status).toBe(204);
		expect(setCookie).toContain(`${PROXY_SESSION_COOKIE_NAME}=${PROXY_SESSION_COOKIE_VALUE}`);
		expect(setCookie).toContain('Path=/');
		expect(setCookie).toContain('HttpOnly');
		expect(setCookie).toContain('SameSite=lax');
		expect(setCookie).not.toContain('Max-Age');
	});

	it('동일한 path의 proxy session cookie를 만료시킨다', () => {
		const response = DELETE();
		const setCookie = response.headers.get('set-cookie');

		expect(response.status).toBe(204);
		expect(setCookie).toContain(`${PROXY_SESSION_COOKIE_NAME}=`);
		expect(setCookie).toContain('Path=/');
		expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
	});
});
