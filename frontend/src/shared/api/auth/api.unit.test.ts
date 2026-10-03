import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';

import { handleGitHubCallback, logoutAuth } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('auth API', () => {
	it('callback 성공 응답이 잘못된 JSON이면 로그인 완료로 처리하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(new Response('{broken', { status: 200, headers: { Authorization: 'Bearer access-token' } })),
		);
		await expect(handleGitHubCallback({ code: 'code', state: 'state' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
	});
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

	it.each([
		{ data: { onboardingStatus: 'UNKNOWN', redirectUrl: '/feeds' }, description: 'unknown onboarding status' },
		{ data: { onboardingStatus: 'COMPLETED' }, description: 'missing redirect URL' },
		{ data: null, description: 'missing callback data' },
	])('$description 응답은 로그인 성공 데이터로 반환하지 않는다', async ({ data }) => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					Response.json(
						{ status: 200, message: 'success', data },
						{ headers: { Authorization: 'Bearer access-token' } },
					),
				),
		);

		await expect(handleGitHubCallback({ code: 'code', state: 'state' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
	});

	it.each(['Bearer ', 'Basic access-token', 'Bearer token other', 'Bearer token, Bearer other'])(
		'잘못된 Authorization 헤더 %s는 access token으로 사용하지 않는다',
		async (header) => {
			vi.stubGlobal(
				'fetch',
				vi
					.fn()
					.mockResolvedValue(
						Response.json(
							{ status: 200, message: 'success', data: { onboardingStatus: 'COMPLETED', redirectUrl: '/' } },
							{ headers: { Authorization: header } },
						),
					),
			);

			await expect(handleGitHubCallback({ code: 'code', state: 'state' })).rejects.toMatchObject({
				type: 'unknown',
				cause: { name: 'InvalidApiResponseError' },
			});
		},
	);
	it('callback 응답의 Authorization이 없으면 공개 요청 진단을 유지한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					status: 200,
					message: 'success',
					data: { onboardingStatus: 'COMPLETED', redirectUrl: '/' },
				}),
			),
		);
		let captured: unknown;
		try {
			await handleGitHubCallback({ code: 'private-code', state: 'private-state' });
		} catch (error) {
			captured = error;
		}
		const normalized = normalizeApiError(captured);
		expect(normalized).toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
		expect(getApiRequestDiagnostics(normalized.cause)).toEqual({
			method: 'POST',
			endpoint: '/v1/auth/github/callback',
			operation: 'oauth.callback',
			target: 'api',
		});
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
