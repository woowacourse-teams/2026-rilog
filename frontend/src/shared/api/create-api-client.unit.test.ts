import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from './create-api-client';

const API_URL = 'https://api.rilog.test/posts';

const createResponse = (status: number) => new Response(null, { status });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('createApiClient', () => {
	it('CSR 요청에 access token을 자동으로 설정한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createResponse(200));
		vi.stubGlobal('fetch', fetchMock);
		const client = createApiClient({
			tokenProvider: {
				getAccessToken: () => 'access-token',
				refreshAccessToken: vi.fn(),
			},
		});

		await client.get(API_URL);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.headers.get('Authorization')).toBe('Bearer access-token');
	});

	it('SSR 요청에는 token을 조회하거나 설정하지 않는다', async () => {
		const getAccessToken = vi.fn(() => 'access-token');
		const refreshAccessToken = vi.fn().mockResolvedValue('refreshed-token');
		const fetchMock = vi.fn().mockResolvedValue(createResponse(401));
		vi.stubGlobal('fetch', fetchMock);
		const client = createApiClient({
			tokenProvider: {
				getAccessToken,
				refreshAccessToken,
			},
		});

		await expect(client.get(API_URL)).rejects.toMatchObject({
			response: { status: 401 },
		});

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(getAccessToken).not.toHaveBeenCalled();
		expect(refreshAccessToken).not.toHaveBeenCalled();
		expect(request.headers.has('Authorization')).toBe(false);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('CSR 요청이 401이면 token을 갱신하고 새 token으로 한 번 재시도한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValueOnce(createResponse(401)).mockResolvedValueOnce(createResponse(200));
		vi.stubGlobal('fetch', fetchMock);
		const refreshAccessToken = vi.fn().mockResolvedValue('refreshed-token');
		const client = createApiClient({
			retry: 0,
			tokenProvider: {
				getAccessToken: () => 'expired-token',
				refreshAccessToken,
			},
		});

		const response = await client.get(API_URL);

		const initialRequest = fetchMock.mock.calls[0]?.[0] as Request;
		const retriedRequest = fetchMock.mock.calls[1]?.[0] as Request;
		expect(response.status).toBe(200);
		expect(refreshAccessToken).toHaveBeenCalledOnce();
		expect(initialRequest.headers.get('Authorization')).toBe('Bearer expired-token');
		expect(retriedRequest.headers.get('Authorization')).toBe('Bearer refreshed-token');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('재시도도 401이면 token을 다시 갱신하지 않는다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createResponse(401));
		vi.stubGlobal('fetch', fetchMock);
		const refreshAccessToken = vi.fn().mockResolvedValue('refreshed-token');
		const client = createApiClient({
			tokenProvider: {
				getAccessToken: () => 'expired-token',
				refreshAccessToken,
			},
		});

		await expect(client.get(API_URL)).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(refreshAccessToken).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('동시에 발생한 401 요청은 하나의 token 갱신 결과를 공유한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(createResponse(401))
			.mockResolvedValueOnce(createResponse(401))
			.mockResolvedValue(createResponse(200));
		vi.stubGlobal('fetch', fetchMock);
		let resolveRefresh: ((token: string) => void) | undefined;
		const refreshAccessToken = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveRefresh = resolve;
				}),
		);
		const client = createApiClient({
			tokenProvider: {
				getAccessToken: () => 'expired-token',
				refreshAccessToken,
			},
		});

		const requests = Promise.all([client.get(API_URL), client.get(API_URL)]);
		await vi.waitFor(() => {
			expect(refreshAccessToken).toHaveBeenCalledOnce();
		});
		resolveRefresh?.('refreshed-token');
		await requests;

		expect(refreshAccessToken).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it('공유한 token 갱신 결과가 null이면 실패를 한 번 알린다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createResponse(401));
		vi.stubGlobal('fetch', fetchMock);
		let resolveRefresh: ((token: string | null) => void) | undefined;
		const refreshAccessToken = vi.fn(
			() =>
				new Promise<string | null>((resolve) => {
					resolveRefresh = resolve;
				}),
		);
		const onTokenRefreshFailure = vi.fn();
		const client = createApiClient({
			onTokenRefreshFailure,
			tokenProvider: {
				getAccessToken: () => 'expired-token',
				refreshAccessToken,
			},
		});

		const requests = Promise.allSettled([client.get(API_URL), client.get(API_URL)]);
		await vi.waitFor(() => {
			expect(refreshAccessToken).toHaveBeenCalledOnce();
		});
		resolveRefresh?.(null);
		const results = await requests;

		expect(results.every(({ status }) => status === 'rejected')).toBe(true);
		expect(onTokenRefreshFailure).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('token 갱신 요청 자체의 오류는 만료 실패로 알리지 않는다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createResponse(401));
		vi.stubGlobal('fetch', fetchMock);
		const onTokenRefreshFailure = vi.fn();
		const client = createApiClient({
			onTokenRefreshFailure,
			tokenProvider: {
				getAccessToken: () => 'expired-token',
				refreshAccessToken: vi.fn().mockRejectedValue(new TypeError('network error')),
			},
		});

		await expect(client.get(API_URL)).rejects.toThrow('network error');

		expect(onTokenRefreshFailure).not.toHaveBeenCalled();
	});
});
