import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearProxySession, registerProxySession } from './api';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('proxy session API', () => {
	it.each([204, 500])('등록 응답(%s)이 늦어져도 삭제 요청은 등록이 끝난 다음 전송한다', async (status) => {
		const registration = Promise.withResolvers<Response>();
		const fetchMock = vi
			.fn()
			.mockReturnValueOnce(registration.promise)
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);
		const register = registerProxySession();
		const clear = clearProxySession();
		const registerResult =
			status === 500
				? expect(register).rejects.toThrow('Proxy session update failed: 500')
				: expect(register).resolves.toBeUndefined();
		try {
			await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		} finally {
			registration.resolve(new Response(null, { status }));
			await registerResult;
			await clear;
		}
		expect(fetchMock.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual(['POST', 'DELETE']);
	});
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
