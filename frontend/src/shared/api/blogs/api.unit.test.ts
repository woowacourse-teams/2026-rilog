import { afterEach, describe, expect, it, vi } from 'vitest';

import { publishPost, readBlogPublicProfile } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('publishPost', () => {
	it('slug의 @ 접두사를 제거하고 발행 요청을 POST로 전송한다', async () => {
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
			title: 'BlockNote 도입기',
			content: [],
			category: 'TECH' as const,
			visibility: 'PUBLIC' as const,
			thumbnailImageUrl: 'posts/cover.png',
			profileImageUrl: null,
		};

		await expect(publishPost({ slug: '@rilog-team', request: requestBody })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/rilog-team/posts');
		expect(capturedBody).toEqual(requestBody);
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
