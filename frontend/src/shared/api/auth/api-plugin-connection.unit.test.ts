import { afterEach, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';

import { refreshPluginConnection } from './api';

const { report } = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock('@/shared/error-tracking/api-error-reporter-instance', () => ({ apiErrorReporter: { report } }));
const profile = { id: 3, nickname: '관리자', slug: 'jetproc' };
const token = (claims = {}) =>
	`header.${Buffer.from(JSON.stringify({ userId: 3, role: 'ADMIN', tokenType: 'ACCESS', exp: Date.now() / 1000 + 60, ...claims })).toString('base64url')}.signature`;

const authFetch = (credential: string, id = 3) =>
	vi.fn((input: Request) =>
		Promise.resolve(
			input.url.endsWith('/refresh')
				? new Response(null, { status: 204, headers: { Authorization: `Bearer ${credential}` } })
				: Response.json({ status: 200, message: 'OK', data: { ...profile, id } }),
		),
	);

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

it.each(['https://develop.rilog.kr', 'https://api.rilog.kr'])(
	'인증 환경을 분리하고 같은 환경의 갱신만 공유한다: %s',
	async (base) => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', base);
		const credential = token();
		const refresh = vi.spyOn(tokenManager, 'refresh').mockResolvedValue(credential);
		const original = tokenManager.getToken();
		const fetchMock = authFetch(credential);
		vi.stubGlobal('fetch', fetchMock);
		await expect(refreshPluginConnection('develop')).resolves.toMatchObject({ accessToken: credential, profile });
		expect(refresh).toHaveBeenCalledTimes(base.includes('develop') ? 1 : 0);
		expect(tokenManager.getToken()).toBe(original);
		const requests = fetchMock.mock.calls.map(([request]) => request);
		expect(requests.map((request) => request.url)).toEqual([
			...(base.includes('develop') ? [] : ['https://develop.rilog.kr/v1/auth/token/refresh']),
			'https://develop.rilog.kr/v1/users/me',
		]);
		expect(requests.at(-1)?.headers.get('Authorization')).toBe(`Bearer ${credential}`);
	},
);

it.each([
	[{ role: 'USER' }, 3, 'ADMIN_REQUIRED'],
	[{ tokenType: 'ONBOARDING' }, 3, 'LOGIN_REQUIRED'],
	[{ exp: 1 }, 3, 'LOGIN_REQUIRED'],
	[{}, 4, 'INVALID_RESPONSE'],
] as const)('권한·만료·사용자 정보가 잘못되면 자격증명을 반환하지 않는다: %j', async (claims, id, code) => {
	vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
	vi.stubGlobal('fetch', authFetch(token(claims), id));
	await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code });
});

it('잘못된 응답은 토큰 없이 안전한 오류와 요청 경로만 보고한다', async () => {
	vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { Authorization: 'Bearer private-secret' } })),
	);
	await expect(refreshPluginConnection('develop')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
	const error: unknown = report.mock.calls[0]?.[0];
	if (!(error instanceof Error)) throw new Error('Expected sanitized error');
	expect(error.message).not.toContain('private-secret');
	expect(getApiRequestDiagnostics(error)).toEqual({
		method: 'POST',
		url: 'https://develop.rilog.kr/v1/auth/token/refresh',
	});
});
