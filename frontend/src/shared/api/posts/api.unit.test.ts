import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPostDetail } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readPostDetail', () => {
	it('게시글 id를 posts resource 경로로 전달한다', async () => {
		const responseBody = {
			status: 200,
			message: 'OK',
			data: {
				title: '첫 번째 글',
				content: [],
				publishedAt: '2026-08-17T00:00:00Z',
				thumbnailImageUrl: null,
				category: 'TECH',
				author: {
					userId: 1,
					nickname: 'jetproc',
					slug: 'jetproc',
					profileImageUrl: 'https://cdn.example.com/profile.png',
				},
				owner: {
					type: 'RILOG',
					blogId: 1,
					slug: 'jetproc',
					name: '제트프로크',
					profileImageUrl: 'https://cdn.example.com/blog.png',
				},
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readPostDetail({ postId: 42 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/42');
	});
});
