import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

import { apiClient } from './api-client';

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
});
