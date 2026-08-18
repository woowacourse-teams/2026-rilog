import { afterEach, describe, expect, it, vi } from 'vitest';

import { readBlogPostDetail } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readBlogPostDetail', () => {
	it('블로그 slug와 게시글 id를 경로로 전달한다', async () => {
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

		await expect(readBlogPostDetail({ slug: 'jetproc', postId: 42 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/jetproc/posts/42');
	});

	it('slug의 @ 접두사를 제거해서 요청한다', async () => {
		const responseBody = {
			status: 200,
			message: 'OK',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readBlogPostDetail({ slug: '@jetproc', postId: 42 });

		expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(Request);
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/jetproc/posts/42');
	});

	it('퍼센트 인코딩된 @ slug도 올바르게 해석해서 요청한다', async () => {
		const responseBody = {
			status: 200,
			message: 'OK',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readBlogPostDetail({ slug: '%40ai-collective', postId: 20 });

		expect(fetchMock.mock.calls[0]?.[0]).toBeInstanceOf(Request);
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/ai-collective/posts/20');
	});
});
