import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient, subscribeTokenRefreshFailure } from './api-client';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

const createResponse = (status: number) => new Response(null, { status });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('apiClient', () => {
	it('설정된 API base URL을 사용하는 전역 client를 제공한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(createResponse(200));
		vi.stubGlobal('fetch', fetchMock);

		await apiClient.get('posts');

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/posts');
	});

	it('token 갱신 실패를 구독자에게 알린다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createResponse(401));
		vi.stubGlobal('fetch', fetchMock);
		const listener = vi.fn();
		const unsubscribe = subscribeTokenRefreshFailure(listener);

		await expect(apiClient.get('posts')).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(listener).toHaveBeenCalledOnce();
		unsubscribe();
	});
});
