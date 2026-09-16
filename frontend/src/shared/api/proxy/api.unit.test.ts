import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearProxySession, registerProxySession } from './api';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('proxy session API', () => {
	it('동일 출처의 proxy session 등록 API를 호출한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		await registerProxySession();

		expect(fetchMock).toHaveBeenCalledWith('/api/auth/proxy-session', {
			credentials: 'same-origin',
			method: 'POST',
		});
	});

	it('동일 출처의 proxy session 삭제 API를 호출한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		await clearProxySession();

		expect(fetchMock).toHaveBeenCalledWith('/api/auth/proxy-session', {
			credentials: 'same-origin',
			method: 'DELETE',
		});
	});

	it('proxy session API가 실패하면 오류를 반환한다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

		await expect(registerProxySession()).rejects.toThrow('Proxy session update failed: 500');
	});
});
