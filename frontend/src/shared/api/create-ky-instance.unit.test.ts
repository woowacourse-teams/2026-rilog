import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_ERROR_CODES } from '@/shared/api/error-codes';
import { createUnauthorizedResponse, createEmptyResponse } from '@/test/fixtures/api-response';

import { createKyInstance } from './create-ky-instance';

const API_URL = 'https://api.rilog.test/posts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('createKyInstance', () => {
	it('CSR 요청에 access token을 자동으로 설정한다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);
		const client = createKyInstance({
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
