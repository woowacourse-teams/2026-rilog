import { afterEach, describe, expect, it, vi } from 'vitest';

import { readBlogPostDetail, readBlogPublicProfile } from './api';

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

describe('readBlogPublicProfile', () => {
	it('블로그 slug를 경로로 전달하여 공개 프로필을 조회한다', async () => {
		const responseBody = {
			status: 200,
			message: '공개 프로필 조회에 성공했습니다.',
			data: {
				type: 'COLOG',
				id: 1,
				name: '리로그 팀',
				slug: 'rilog-team',
				introduction: '함께 쓰는 기술 블로그',
				profileImageUrl: 'https://example.com/profileImage.png',
				coverImageUrl: 'https://example.com/coverImage.png',
				serviceUrl: 'https://rilog.example.com',
				githubUrl: 'https://github.com/rilog',
				memberCount: 10,
				postCount: 24,
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readBlogPublicProfile({ slug: 'rilog-team' })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/@rilog-team');
	});

	it('slug에 @ 접두사가 붙어 있어도 중복 없이 @slug 형태로 요청한다', async () => {
		const responseBody = {
			status: 200,
			message: '공개 프로필 조회에 성공했습니다.',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readBlogPublicProfile({ slug: '@rilog-team' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/@rilog-team');
	});
});
