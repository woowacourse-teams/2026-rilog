import { afterEach, describe, expect, it, vi } from 'vitest';

import { readFullFeedPosts } from './feeds.apis';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readFullFeedPosts', () => {
	it('전체 피드 게시물의 page와 size를 query parameter로 전달한다', async () => {
		const responseBody = {
			status: 200,
			message: 'OK',
			data: {
				posts: [],
				page: 2,
				size: 12,
				numberOfElements: 0,
				hasNext: false,
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readFullFeedPosts({ page: 2, size: 12 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/feeds/posts?page=2&size=12');
	});
});
