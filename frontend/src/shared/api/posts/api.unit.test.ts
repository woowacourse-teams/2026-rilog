import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	addPostCommentAnchor,
	createPostCommentAnchor,
	deletePost,
	deletePostCommentAnchor,
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

const COMMENT_GROUP = {
	selectionId: 91,
	range: { startOffset: 2, endOffset: 6 },
	selectedText: '선택',
	state: 'ACTIVE',
	anchorCount: 1,
	commentAnchors: [
		{
			commentAnchorId: 900,
			content: '댓글',
			author: {
				userId: 3,
				nickname: '작성자',
				slug: 'author',
				profileImageUrl: null,
				isPostAuthor: true,
				isBlogMember: false,
			},
			canEdit: true,
			canDelete: true,
			isEdited: false,
			createdAt: '2026-09-27T10:49:45.375Z',
			updatedAt: '2026-09-27T10:49:45.375Z',
		},
	],
};

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

	it('발행 응답의 식별자가 잘못되면 성공으로 반환하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					status: 201,
					message: 'OK',
					data: { postId: '42', slug: 'rilog-team' },
				}),
			),
		);
		await expect(
			publishPost({
				slug: 'rilog-team',
				title: '제목',
				content: [],
				category: 'TECH',
				visibility: 'PUBLIC',
				thumbnailImageUrl: null,
				chapterId: null,
			}),
		).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
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
				category: '기술',
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

	it.each([
		null,
		[
			{
				id: '1',
				type: 'paragraph',
				props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
				content: null,
				children: [],
			},
		],
	])('손상된 상세 본문을 성공 데이터로 반환하지 않는다', async (content) => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					status: 200,
					message: 'OK',
					data: {
						title: '첫 번째 글',
						content,
						publishedAt: '2026-08-17T00:00:00Z',
						thumbnailImageUrl: null,
						category: '기술',
						chapter: null,
						author: { userId: 1, nickname: 'jetproc', slug: 'jetproc', profileImageUrl: null },
						owner: { type: 'RILOG', blogId: 1, slug: 'jetproc', name: '블로그', profileImageUrl: null },
						viewerPermissions: { canEdit: false, canDelete: false },
					},
				}),
			),
		);
		await expect(readPostDetail({ slug: 'jetproc', postId: 42 })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
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

	it('수정 응답의 필수 slug가 없으면 성공으로 반환하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json({ status: 200, message: 'OK', data: { postId: 42 } })),
		);
		await expect(
			updatePost(42, {
				slug: 'rilog-team',
				title: '제목',
				content: [],
				category: 'TECH',
				visibility: 'PUBLIC',
				thumbnailImageUrl: null,
				chapterId: null,
			}),
		).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
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

	it('중첩된 댓글의 작성자와 권한까지 확인한 뒤 반환한다', async () => {
		const response = {
			status: 0,
			message: 'OK',
			data: { blocks: [{ blockId: 'block-1', anchorGroups: [COMMENT_GROUP] }] },
		};
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(response)));
		await expect(readPostCommentAnchors(81)).resolves.toEqual(response);
	});

	it.each([
		{ label: '선택 상태', group: { ...COMMENT_GROUP, state: 'OUTDATED' } },
		{ label: '선택 범위', group: { ...COMMENT_GROUP, range: { startOffset: '2', endOffset: 6 } } },
		{
			label: '댓글 작성자 권한',
			group: {
				...COMMENT_GROUP,
				commentAnchors: [
					{
						...COMMENT_GROUP.commentAnchors[0],
						author: { ...COMMENT_GROUP.commentAnchors[0].author, isBlogMember: 'false' },
					},
				],
			},
		},
	])('$label 값이 손상되면 조회 응답을 캐시에 전달하지 않는다', async ({ group }) => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					status: 0,
					message: 'OK',
					data: { blocks: [{ blockId: 'block-1', anchorGroups: [group] }] },
				}),
			),
		);
		await expect(readPostCommentAnchors(81)).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
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

	it('사이드바 그룹의 blockId가 누락되면 조회 응답을 반환하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json({ status: 0, message: 'OK', data: { anchorGroups: [COMMENT_GROUP] } })),
		);
		await expect(readPostCommentAnchorsSidebar(81)).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
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

	it('작성 결과의 댓글 id가 손상되면 성공으로 처리하거나 재전송하지 않는다', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(Response.json({ status: 0, message: 'OK', data: { commentAnchorId: '900' } }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(
			createPostCommentAnchor(81, {
				blockId: 'block-1',
				startOffset: 0,
				endOffset: 2,
				selectedText: '인용',
				content: '댓글',
			}),
		).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
		expect(fetchMock).toHaveBeenCalledTimes(1);
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

	it('추가 작성 결과의 데이터가 누락되면 성공으로 처리하거나 재전송하지 않는다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: 0, message: 'OK' }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(addPostCommentAnchor(81, 91, { content: '댓글' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
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

	it('수정 결과의 편집 상태가 손상되면 성공으로 처리하거나 재전송하지 않는다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			Response.json({
				status: 0,
				message: 'OK',
				data: {
					commentAnchorId: 901,
					content: '수정',
					isEdited: 'true',
					createdAt: '2026-09-27T10:49:45.375Z',
					updatedAt: '2026-09-27T10:50:45.375Z',
				},
			}),
		);
		vi.stubGlobal('fetch', fetchMock);
		await expect(updatePostCommentAnchor(81, 901, { content: '수정' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('deletePostCommentAnchor', () => {
	it('댓글 id 경로에 본문 없이 DELETE하고 두 id가 포함된 JSON 응답을 반환한다', async () => {
		const response = { status: 0, message: 'OK', data: { commentAnchorId: 901, selectionId: 91 } };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(response));
		vi.stubGlobal('fetch', fetchMock);
		await expect(deletePostCommentAnchor(81, 901)).resolves.toEqual(response);
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.method).toBe('DELETE');
		expect(request.url).toBe('https://api.rilog.test/v1/posts/81/comment-anchors/901');
		expect(await request.text()).toBe('');
	});
	it('삭제 결과의 선택 id가 손상되면 성공으로 처리하거나 재전송하지 않는다', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				Response.json({ status: 0, message: 'OK', data: { commentAnchorId: 901, selectionId: '91' } }),
			);
		vi.stubGlobal('fetch', fetchMock);
		await expect(deletePostCommentAnchor(81, 901)).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('삭제가 거절되면 정규화된 오류를 전달한다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
		await expect(deletePostCommentAnchor(81, 901)).rejects.toMatchObject({ type: 'http', response: { status: 403 } });
	});
});

const POST_REQUEST = {
	slug: 'rilog-team',
	title: '제목',
	content: [],
	category: 'TECH' as const,
	visibility: 'PUBLIC' as const,
	thumbnailImageUrl: null,
	chapterId: null,
};

it.each([
	{ operation: '게시글 발행', request: () => publishPost(POST_REQUEST) },
	{ operation: '게시글 상세 조회', request: () => readPostDetail({ slug: 'rilog-team', postId: 42 }) },
	{ operation: '게시글 수정', request: () => updatePost(42, POST_REQUEST) },
	{ operation: '인라인 댓글 본문 조회', request: () => readPostCommentAnchors(42) },
	{ operation: '인라인 댓글 사이드바 조회', request: () => readPostCommentAnchorsSidebar(42) },
	{
		operation: '인라인 댓글 작성',
		request: () =>
			createPostCommentAnchor(42, {
				blockId: 'block-1',
				startOffset: 0,
				endOffset: 2,
				selectedText: '인용',
				content: '댓글',
			}),
	},
	{ operation: '기존 인용에 댓글 작성', request: () => addPostCommentAnchor(42, 9, { content: '댓글' }) },
	{ operation: '인라인 댓글 수정', request: () => updatePostCommentAnchor(42, 9, { content: '수정' }) },
	{ operation: '인라인 댓글 삭제', request: () => deletePostCommentAnchor(42, 9) },
])('$operation 성공 응답이 잘못된 JSON이면 요청을 반복하지 않고 응답 확인 실패로 처리한다', async ({ request }) => {
	const fetchMock = vi.fn().mockResolvedValue(new Response('{broken', { status: 200 }));
	vi.stubGlobal('fetch', fetchMock);
	await expect(request()).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
	expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('HTTP 거부와 네트워크 오류는 JSON 검증 실패로 바꾸지 않는다', async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce(new Response(null, { status: 503 }))
		.mockRejectedValueOnce(new TypeError('network unavailable'));
	vi.stubGlobal('fetch', fetchMock);
	await expect(publishPost(POST_REQUEST)).rejects.toMatchObject({ type: 'http', response: { status: 503 } });
	await expect(publishPost(POST_REQUEST)).rejects.toMatchObject({ type: 'network' });
	expect(fetchMock).toHaveBeenCalledTimes(2);
});
