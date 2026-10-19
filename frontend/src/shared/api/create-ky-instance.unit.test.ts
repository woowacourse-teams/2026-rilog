import { afterEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { API_ERROR_CODES } from '@/shared/api/error-codes';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';
import { parseApiJsonResponse } from '@/shared/api/response-validation';
import { createUnauthorizedResponse, createEmptyResponse } from '@/test/fixtures/api-response';

import { createKyInstance } from './create-ky-instance';

const API_URL = 'https://api.rilog.test/posts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('createKyInstance', () => {
	it.each([
		['로그아웃', () => tokenManager.publishLogout(), null],
		['B 로그인', () => tokenManager.publishLogin('B-token'), 'B-token'],
	] as const)(
		'갱신 후 재전송 대기 중 %s하면 이전 요청을 보내지 않는다',
		async (_label, changeSession, expectedToken) => {
			vi.stubGlobal('window', {});
			await tokenManager.publishLogin('A-token');
			const transitioned = Promise.withResolvers<void>();
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(createUnauthorizedResponse())
				.mockResolvedValueOnce(new Response(null, { status: 204 }));
			vi.stubGlobal('fetch', fetchMock);
			const refresh = vi.spyOn(tokenManager, 'refresh').mockImplementation(() => {
				tokenManager.setToken('A-refreshed');
				// Registered before Ky's delay(0), after the expired response has been parsed.
				setTimeout(() => void changeSession().then(transitioned.resolve, transitioned.reject), 0);
				return Promise.resolve('A-refreshed');
			});
			const retryReady = vi.fn(() => {
				expect(tokenManager.getToken()).toBe(expectedToken);
			});
			const client = createKyInstance({
				baseUrl: 'https://api.rilog.test',
				tokenManager,
				hooks: { beforeRetry: [retryReady] },
			});
			try {
				const failed = expect(
					client.post('v1/posts/42/views', { retry: { limit: 1, methods: [] } }),
				).rejects.toMatchObject({
					name: 'AbortError',
				});
				await transitioned.promise;
				await failed;
				expect(retryReady).toHaveBeenCalledOnce();
				expect(refresh).toHaveBeenCalledOnce();
				expect(fetchMock).toHaveBeenCalledOnce();
				expect(tokenManager.getToken()).toBe(expectedToken);
			} finally {
				await tokenManager.publishLogout();
			}
		},
	);
	it.each([
		['로그아웃', () => tokenManager.publishLogout(), null],
		['B 로그인', () => tokenManager.publishLogin('B-token'), 'Bearer B-token'],
	] as const)(
		'지연 retry hook 중 %s해도 이전 요청만 취소하고 새 요청은 허용한다',
		async (_label, changeSession, authorization) => {
			vi.stubGlobal('window', {});
			await tokenManager.publishLogin('A-token');
			const retryStarted = Promise.withResolvers<void>();
			const continueRetry = Promise.withResolvers<void>();
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(createUnauthorizedResponse())
				.mockResolvedValue(new Response(null, { status: 204 }));
			vi.stubGlobal('fetch', fetchMock);
			vi.spyOn(tokenManager, 'refresh').mockResolvedValue('A-refreshed');
			const client = createKyInstance({
				baseUrl: 'https://api.rilog.test',
				tokenManager,
				hooks: {
					beforeRetry: [
						async ({ request }) => {
							retryStarted.resolve();
							await continueRetry.promise;
							return request;
						},
					],
				},
			});
			// Reusing caller context must not merge the two requests' captured sessions.
			const options = { context: { trace: 'shared' }, retry: { limit: 1, methods: [] } };
			try {
				const failed = expect(client.post('v1/posts/42/views', options)).rejects.toMatchObject({ name: 'AbortError' });
				await retryStarted.promise;
				await changeSession();
				expect((await client.post('v1/posts/42/views', options)).status).toBe(204);
				continueRetry.resolve();
				await failed;
				expect(fetchMock).toHaveBeenCalledTimes(2);
				expect((fetchMock.mock.calls[0][0] as Request).headers.get('Authorization')).toBe('Bearer A-token');
				expect((fetchMock.mock.calls[1][0] as Request).headers.get('Authorization')).toBe(authorization);
				expect(options.context).toEqual({ trace: 'shared' });
			} finally {
				continueRetry.resolve();
				await tokenManager.publishLogout();
			}
		},
	);
	it('A 등록의 늦은 만료 응답은 세션 세대가 바뀐 후 새 세션으로 재전송하지 않는다', async () => {
		vi.stubGlobal('window', {});
		let version = 1;
		const started = Promise.withResolvers<void>();
		const delayed = Promise.withResolvers<Response>();
		const fetchMock = vi.fn().mockImplementation(() => {
			started.resolve();
			return delayed.promise;
		});
		vi.stubGlobal('fetch', fetchMock);
		const refresh = vi.fn().mockResolvedValue('new-session-token');
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: { getToken: () => 'original-token', getSessionVersion: () => version, refresh },
		});
		const failed = expect(client.post('v1/posts/42/views', { retry: { limit: 1, methods: [] } })).rejects.toMatchObject(
			{ response: { status: 401 } },
		);
		await started.promise;
		version = 2;
		delayed.resolve(createUnauthorizedResponse());
		await failed;
		expect(refresh).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledOnce();
	});
	it('토큰 갱신을 기다리는 동안 세션이 바뀌면 기존 요청을 재전송하지 않는다', async () => {
		vi.stubGlobal('window', {});
		let version = 1;
		const started = Promise.withResolvers<void>();
		const refreshed = Promise.withResolvers<string>();
		const fetchMock = vi.fn().mockResolvedValue(createUnauthorizedResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: {
				getToken: () => 'original-token',
				getSessionVersion: () => version,
				refresh: () => {
					started.resolve();
					return refreshed.promise;
				},
			},
		});
		const failed = expect(client.post('v1/posts/42/views', { retry: { limit: 1, methods: [] } })).rejects.toMatchObject(
			{ response: { status: 401 } },
		);
		await started.promise;
		version = 2;
		refreshed.resolve('other-session-token');
		await failed;
		expect(fetchMock).toHaveBeenCalledOnce();
	});
	it('조회 등록의 일반 재시도 차단 옵션에서도 만료 토큰은 한 번 복구한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(createUnauthorizedResponse(API_ERROR_CODES.EXPIRED_ACCESS_TOKEN))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		const unusedFetch = vi.fn().mockRejectedValue(new Error('The caller-supplied fetch must be used.'));
		vi.stubGlobal('fetch', unusedFetch);
		const refresh = vi.fn().mockResolvedValue('refreshed-token');
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			credentials: 'include',
			tokenManager: { getToken: () => 'expired-token', getSessionVersion: () => 1, refresh },
		});
		const response = await client.post('v1/posts/42/views', { fetch: fetchMock, retry: { limit: 1, methods: [] } });
		expect(response.status).toBe(204);
		expect(refresh).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(unusedFetch).not.toHaveBeenCalled();
		const request = fetchMock.mock.calls[1][0] as Request;
		expect(request.headers.get('Authorization')).toBe('Bearer refreshed-token');
		expect(request.credentials).toBe('include');
		expect(await request.text()).toBe('');
	});
	it('후속 hook이 응답을 교체해도 검증 오류에는 공개 요청 경로만 연결한다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 200, message: 'OK', data: null })));
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			hooks: {
				afterResponse: [() => new Response('{broken', { status: 200 })],
			},
		});
		const response = await client.get('v1/blogs/private/posts/42?token=secret');
		let captured: unknown;
		try {
			await parseApiJsonResponse(response, 'post.read', (value): value is null => value === null);
		} catch (error) {
			captured = error;
		}
		expect(getApiRequestDiagnostics(captured)).toEqual({
			method: 'GET',
			url: 'https://api.rilog.test/v1/blogs/private/posts/42?token=secret',
		});
	});
	it('CSR 요청에 access token을 자동으로 설정한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: {
				getToken: () => 'access-token',
				refresh: vi.fn(),
			},
		});

		await client.get(API_URL);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.headers.get('Authorization')).toBe('Bearer access-token');
	});

	it('SSR 요청에는 token을 조회하거나 설정하지 않는다', async () => {
		const getToken = vi.fn(() => 'access-token');
		const refresh = vi.fn().mockResolvedValue('refreshed-token');
		const fetchMock = vi.fn().mockResolvedValue(createUnauthorizedResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
			tokenManager: {
				getToken,
				refresh,
			},
		});

		await expect(client.get(API_URL)).rejects.toMatchObject({
			response: { status: 401 },
		});

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(getToken).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
		expect(request.headers.has('Authorization')).toBe(false);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('CSR 요청이 401이면 token을 갱신하고 새 token으로 한 번 재시도한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(createUnauthorizedResponse(API_ERROR_CODES.EXPIRED_ACCESS_TOKEN))
			.mockResolvedValueOnce(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);
		const refresh = vi.fn().mockResolvedValue('refreshed-token');
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			retry: 0,
			tokenManager: {
				getToken: () => 'expired-token',
				refresh,
			},
		});

		const response = await client.get(API_URL);

		const initialRequest = fetchMock.mock.calls[0]?.[0] as Request;
		const retriedRequest = fetchMock.mock.calls[1]?.[0] as Request;
		expect(response.status).toBe(200);
		expect(refresh).toHaveBeenCalledOnce();
		expect(initialRequest.headers.get('Authorization')).toBe('Bearer expired-token');
		expect(retriedRequest.headers.get('Authorization')).toBe('Bearer refreshed-token');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('만료 이외의 인증 오류는 token을 갱신하지 않는다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createUnauthorizedResponse(API_ERROR_CODES.INVALID_ACCESS_TOKEN));
		vi.stubGlobal('fetch', fetchMock);
		const refresh = vi.fn().mockResolvedValue('refreshed-token');
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: {
				getToken: () => 'invalid-token',
				refresh,
			},
		});

		await expect(client.get(API_URL)).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(refresh).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('API base URL과 다른 외부 도메인 URL 요청에는 Authorization 토큰을 설정하지 않는다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: {
				getToken: () => 'secret-token',
				refresh: vi.fn(),
			},
		});

		await client.put('https://s3.amazonaws.com/uploads/file.png');

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.headers.has('Authorization')).toBe(false);
	});

	it('skipAuth 옵션이 지정된 경우 Authorization 토큰을 설정하지 않는다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
			baseUrl: 'https://api.rilog.test',
			tokenManager: {
				getToken: () => 'secret-token',
				refresh: vi.fn(),
			},
		});

		await client.get('https://api.rilog.test/public', {
			skipAuth: true,
		} as never);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.headers.has('Authorization')).toBe(false);
	});
});
