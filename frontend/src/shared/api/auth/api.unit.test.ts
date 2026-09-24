import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleGitHubCallback, logoutAuth } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('auth API', () => {
	it('GitHub callback 결과와 Authorization access token을 함께 반환한다', async () => {
		const responseBody = {
			status: 200,
			message: '로그인 성공',
			data: { onboardingStatus: 'COMPLETED' as const, redirectUrl: '/feeds' },
		};
		let capturedBody: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			capturedBody = await (input as Request).clone().json();

			return Response.json(responseBody, { headers: { Authorization: 'Bearer access-token' } });
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(handleGitHubCallback({ code: 'code', state: 'state' })).resolves.toEqual({
			data: responseBody,
			accessToken: 'access-token',
		});

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/auth/github/callback');
		expect(capturedBody).toEqual({ code: 'code', state: 'state' });
	});

	it('로그아웃을 credential과 함께 요청한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(logoutAuth()).resolves.toHaveProperty('status', 204);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/auth/logout');
		expect(request.credentials).toBe('include');
	});
});
