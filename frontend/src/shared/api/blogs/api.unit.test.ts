import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BlogProfileUpdateRequest } from './types';

import { readBlogPublicProfile, readPublicBlogPosts, updateBlogProfile } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('updateBlogProfile', () => {
	it('정규화한 slug와 요청 본문으로 블로그 프로필 수정 PATCH 요청을 보낸다', async () => {
		let capturedRequest: Request | undefined;
		let capturedBody: unknown;
		const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			capturedRequest = input as Request;
			capturedBody = await capturedRequest.clone().json();
			return Response.json({ status: 200, message: '팀 프로필을 수정했습니다.' });
		});
		vi.stubGlobal('fetch', fetchMock);
		const request: BlogProfileUpdateRequest = {
			name: '리로그 팀',
			profileImageUrl: 'rilog/uploads/images/logo.png',
			coverImageUrl: null,
			introduction: '함께 기록하는 팀',
			serviceUrl: null,
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
		};

		await updateBlogProfile('@rilog/team', request);

		expect(capturedRequest?.method).toBe('PATCH');
		expect(capturedRequest?.url).toBe('https://api.rilog.test/v1/blogs/rilog%2Fteam/profiles');
		expect(capturedBody).toEqual(request);
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
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/rilog-team');
	});

	it('slug에 @ 접두사가 붙어 있으면 제거한 경로로 요청한다', async () => {
		const responseBody = {
			status: 200,
			message: '공개 프로필 조회에 성공했습니다.',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readBlogPublicProfile({ slug: '@rilog-team' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/rilog-team');
	});
});

describe('readPublicBlogPosts', () => {
	it('slug의 @ 접두사를 제거하고 pagination query와 함께 공개 글 목록을 조회한다', async () => {
		const responseBody = {
			status: 200,
			message: '공개 블로그 게시글 목록 조회에 성공했습니다.',
			data: {
				type: 'COLOG',
				posts: [],
				page: 2,
				size: 12,
				numberOfElements: 0,
				hasNext: false,
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readPublicBlogPosts({ slug: '@rilog-team', page: 2, size: 12 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/rilog-team/posts?page=2&size=12');
	});
});
