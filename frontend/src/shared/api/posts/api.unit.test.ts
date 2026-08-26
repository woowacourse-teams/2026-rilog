import { afterEach, describe, expect, it, vi } from 'vitest';

import { publishPost, readPostDetail, updatePost } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('publishPost', () => {
	it('slug의 @ 접두사를 제거해 요청 본문에 포함하고 게시글 endpoint로 POST한다', async () => {
		const responseBody = {
			status: 201,
			message: '게시글 발행에 성공했습니다.',
			data: { postId: 42, slug: 'rilog-team' },
		};
		let capturedBody: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) {
				capturedBody = await input.clone().json();
			}

			return Response.json(responseBody, { status: 201 });
		});
		vi.stubGlobal('fetch', fetchMock);
		const requestBody = {
			slug: '@rilog-team',
			title: 'BlockNote 도입기',
			content: [],
			category: 'TECH' as const,
			visibility: 'PUBLIC' as const,
			thumbnailImageUrl: 'posts/cover.png',
			profileImageUrl: null,
		};

		await expect(publishPost(requestBody)).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/posts');
		expect(capturedBody).toEqual({
			...requestBody,
			slug: 'rilog-team',
		});
	});
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

describe('updatePost', () => {
	it('게시글 id를 경로로 전달하고 정규화한 slug와 수정 내용을 PUT 요청 본문에 포함한다', async () => {
		const responseBody = {
			status: 200,
			message: '게시글 수정에 성공했습니다.',
			data: { postId: 42, slug: 'rilog-team' },
		};
		let capturedBody: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) {
				capturedBody = await input.clone().json();
			}

			return Response.json(responseBody);
		});
		vi.stubGlobal('fetch', fetchMock);
		const requestBody = {
			slug: '@rilog-team',
			title: '수정한 게시글',
			content: [],
			category: 'TECH' as const,
			visibility: 'PUBLIC' as const,
			thumbnailImageUrl: 'posts/updated-cover.png',
		};

		await expect(updatePost(42, requestBody)).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('PUT');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/42');
		expect(capturedBody).toEqual({
			...requestBody,
			slug: 'rilog-team',
		});
	});
});
