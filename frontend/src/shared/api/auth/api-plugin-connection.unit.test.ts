import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';

import { refreshPluginConnection } from './api';

const { reportMock } = vi.hoisted(() => ({ reportMock: vi.fn() }));
vi.mock('@/shared/error-tracking/api-error-reporter-instance', () => ({ apiErrorReporter: { report: reportMock } }));

const token = (changes: Record<string, unknown> = {}) =>
	`header.${Buffer.from(JSON.stringify({ userId: 3, role: 'ADMIN', tokenType: 'ACCESS', exp: Math.floor(Date.now() / 1000) + 60, ...changes })).toString('base64url')}.signature`;

const profile = { id: 3, nickname: '파라디', slug: 'jetproc' };

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test'));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe('플러그인 관리자 인증', () => {
	it('선택한 환경의 쿠키를 갱신하고 같은 토큰으로 사용자 정보를 확인한다', async () => {
		const credential = token();
		const calls: Request[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL) => {
				const request = input as Request;
				calls.push(request);
				return Promise.resolve(
					request.url.endsWith('/refresh')
						? new Response(null, { status: 204, headers: { Authorization: `Bearer ${credential}` } })
						: Response.json({ status: 200, message: 'OK', data: profile }),
				);
			}),
		);
		await expect(refreshPluginConnection('develop')).resolves.toMatchObject({ accessToken: credential, profile });
		expect(calls.map((request) => [request.method, request.url, request.credentials])).toEqual([
			['POST', 'https://develop.rilog.kr/v1/auth/token/refresh', 'include'],
			['GET', 'https://develop.rilog.kr/v1/users/me', 'omit'],
		]);
		expect(calls[0].headers.has('Authorization')).toBe(false);
		expect(calls[1].headers.get('Authorization')).toBe(`Bearer ${credential}`);
		expect(reportMock).not.toHaveBeenCalled();
	});

	it.each([
		{ claim: { role: 'USER' }, code: 'ADMIN_REQUIRED' },
		{ claim: { tokenType: 'ONBOARDING' }, code: 'LOGIN_REQUIRED' },
		{ claim: { exp: 1 }, code: 'LOGIN_REQUIRED' },
	])('권한이나 토큰 종류가 맞지 않으면 프로필 요청을 보내지 않는다: $code', async ({ claim, code }) => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 204, headers: { Authorization: `Bearer ${token(claim)}` } }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(refreshPluginConnection('production')).rejects.toMatchObject({ code });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('로그인 쿠키가 없으면 재전송 없이 로그인 필요 상태로 반환한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ errorCode: 'REFRESH_TOKEN_MISSING' }, { status: 401 }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code: 'LOGIN_REQUIRED' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(reportMock).not.toHaveBeenCalled();
	});

	it('프로필 ID가 토큰과 다르면 연결 자격증명을 반환하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL) =>
				Promise.resolve(
					(input as Request).url.endsWith('/refresh')
						? new Response(null, { status: 204, headers: { Authorization: `Bearer ${token()}` } })
						: Response.json({ status: 200, message: 'OK', data: { ...profile, id: 4 } }),
				),
			),
		);
		await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
		expect(reportMock).toHaveBeenCalledTimes(1);
	});

	it('잘못된 응답은 토큰이 없는 안전한 오류와 요청 경로만 보고한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(new Response(null, { status: 204, headers: { Authorization: 'Bearer malformed-secret' } })),
		);
		await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
		const failure: unknown = reportMock.mock.calls[0]?.[0];
		if (!(failure instanceof Error)) throw new Error('Expected sanitized error');
		expect(failure.message).not.toContain('malformed-secret');
		expect(getApiRequestDiagnostics(failure)).toEqual({
			method: 'POST',
			url: 'https://develop.rilog.kr/v1/auth/token/refresh',
		});
	});
	it('같은 환경은 전역 세션의 진행 중인 refresh 경로를 공유하고 별도 POST를 보내지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://develop.rilog.kr/');
		const credential = token();
		const refresh = vi.spyOn(tokenManager, 'refresh').mockResolvedValue(credential);
		const calls: Request[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL) => {
				calls.push(input as Request);
				return Promise.resolve(Response.json({ status: 200, message: 'OK', data: profile }));
			}),
		);
		await expect(refreshPluginConnection('develop')).resolves.toMatchObject({ accessToken: credential, profile });
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(calls.map((request) => [request.method, request.url])).toEqual([
			['GET', 'https://develop.rilog.kr/v1/users/me'],
		]);
	});
	it('다른 환경은 전역 세션을 갱신하거나 토큰을 덮어쓰지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.kr');
		const refresh = vi.spyOn(tokenManager, 'refresh');
		const originalToken = tokenManager.getToken();
		vi.stubGlobal(
			'fetch',
			vi.fn((input: RequestInfo | URL) =>
				Promise.resolve(
					(input as Request).url.endsWith('/refresh')
						? new Response(null, { status: 204, headers: { Authorization: 'Bearer ' + token() } })
						: Response.json({ status: 200, message: 'OK', data: profile }),
				),
			),
		);
		await refreshPluginConnection('develop');
		expect(refresh).not.toHaveBeenCalled();
		expect(tokenManager.getToken()).toBe(originalToken);
	});
	it('같은 환경의 공유 refresh가 실패하면 프로필 요청 없이 로그인 필요로 처리한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://develop.rilog.kr');
		vi.spyOn(tokenManager, 'refresh').mockResolvedValue(null);
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code: 'LOGIN_REQUIRED' });
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
