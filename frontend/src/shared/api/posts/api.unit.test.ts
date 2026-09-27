import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	addPostCommentAnchor,
	createPostCommentAnchor,
	deletePost,
	publishPost,
	readPostCommentAnchors,
	readPostCommentAnchorsSidebar,
	readPostDetail,
	updatePost,
	updatePostCommentAnchor,
} from './api';

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
			chapterId: 12,
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
	it('slug와 게시글 id를 blogs resource 경로로 전달한다', async () => {
		const responseBody = {
			status: 200,
			message: 'OK',
			data: {
				title: '첫 번째 글',
				content: [],
				publishedAt: '2026-08-17T00:00:00Z',
				thumbnailImageUrl: null,
				category: 'TECH',
				chapter: null,
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
				viewerPermissions: {
					canEdit: false,
					canDelete: false,
				},
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readPostDetail({ slug: '@rilog-team', postId: 42 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/blogs/rilog-team/posts/42');
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
			thumbnailImageUrl: null,
			chapterId: 8,
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

describe('deletePost', () => {
	it('게시글 id를 경로로 전달해 DELETE하고 204 응답을 반환한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await deletePost(42);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('DELETE');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/42');
		expect(response.status).toBe(204);
	});
});

describe('readPostCommentAnchors', () => {
	it('게시글 인라인 댓글 목록 endpoint로 GET하고 응답 envelope를 유지한다', async () => {
		const response = { status: 0, message: 'OK', data: { blocks: [] } };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(response));
		vi.stubGlobal('fetch', fetchMock);
		await expect(readPostCommentAnchors(81)).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/comment-anchors');
	});
});

describe('readPostCommentAnchorsSidebar', () => {
	it('사이드바 전용 endpoint로 GET하고 평면 응답을 유지한다', async () => {
		const response = { status: 0, message: 'OK', data: { anchorGroups: [] } };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(response));
		vi.stubGlobal('fetch', fetchMock);
		await expect(readPostCommentAnchorsSidebar(81)).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/comment-anchors/sidebar');
	});
});

describe('createPostCommentAnchor', () => {
	it('선택 범위와 댓글을 그대로 POST하고 생성된 댓글 id를 반환한다', async () => {
		const response = { status: 0, message: 'OK', data: { commentAnchorId: 900 } };
		let body: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) body = await input.clone().json();
			return Response.json(response);
		});
		vi.stubGlobal('fetch', fetchMock);
		const payload = {
			blockId: 'block-1',
			startOffset: 2,
			endOffset: 6,
			selectedText: ' 선택 ',
			content: '댓글\n둘째 줄',
		};
		await expect(createPostCommentAnchor(81, payload)).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/comment-anchors');
		expect(body).toEqual(payload);
	});
});

describe('addPostCommentAnchor', () => {
	it('selectionId를 경로에 넣고 content만 POST한다', async () => {
		const response = { status: 0, message: 'OK', data: { commentAnchorId: 901 } };
		let body: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) body = await input.clone().json();
			return Response.json(response);
		});
		vi.stubGlobal('fetch', fetchMock);
		await expect(addPostCommentAnchor(81, 91, { content: '추가 댓글\n둘째 줄' })).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/selections/91/comment-anchors');
		expect(body).toEqual({ content: '추가 댓글\n둘째 줄' });
	});
});

describe('updatePostCommentAnchor', () => {
	it('댓글 id를 경로에 넣고 content만 PATCH하며 수정 응답을 반환한다', async () => {
		const response = {
			status: 0,
			message: 'OK',
			data: {
				commentAnchorId: 901,
				content: '수정\n내용',
				isEdited: true,
				createdAt: '2026-09-27T10:49:45.375Z',
				updatedAt: '2026-09-27T10:50:45.375Z',
			},
		};
		let body: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) body = await input.clone().json();
			return Response.json(response);
		});
		vi.stubGlobal('fetch', fetchMock);
		await expect(updatePostCommentAnchor(81, 901, { content: '수정\n내용' })).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/comment-anchors/901');
		expect(body).toEqual({ content: '수정\n내용' });
	});
});
