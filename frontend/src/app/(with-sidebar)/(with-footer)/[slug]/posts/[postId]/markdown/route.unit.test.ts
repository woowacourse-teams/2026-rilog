import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const createPostDetailResponse = (ownerSlug = 'actual', title = '게시글 제목') =>
	Response.json({
		data: {
			title,
			content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }],
			author: { nickname: '작성자' },
			owner: { slug: ownerSlug },
			category: '기술',
			publishedAt: '2026-09-01T00:00:00',
		},
	});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('게시글 Markdown 표현', () => {
	it('공개 API 경로로 조회하고 canonical과 noindex를 반환한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test/');
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(createPostDetailResponse('actual', '줄바꿈\n제목 " 인용'));
		vi.stubGlobal('fetch', fetchMock);

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});
		const markdown = await response.text();

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.rilog.test/v1/blogs/actual/posts/1',
			expect.objectContaining({ next: { revalidate: 600 } }),
		);
		expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
		expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
		expect(response.headers.get('Link')).toBe('<https://www.rilog.kr/@actual/posts/1>; rel="canonical"');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=600, stale-while-revalidate=3600');
		expect(markdown).toContain('title: "줄바꿈\\n제목 \\" 인용"');
	});

	it('다른 블로그 slug의 요청은 게시글을 노출하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createPostDetailResponse()));

		const response = await GET(new Request('https://www.rilog.kr/@wrong/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@wrong', postId: '1' }),
		});

		expect(response.status).toBe(404);
	});

	it('잘못된 게시글 ID는 API를 호출하지 않고 404를 반환한다', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/0/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '0' }),
		});

		expect(response.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('API 주소가 없으면 503을 반환한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(response.status).toBe(503);
	});

	it.each([403, 404])('게시글이 없거나 공개 접근이 거부되면 %i를 반환한다', async (status) => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status })));

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(response.status).toBe(404);
	});

	it.each([401, 500])('예상하지 못한 API 상태 %i는 503으로 처리한다', async (status) => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status })));

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(response.status).toBe(503);
	});

	it('네트워크 오류와 시간 초과는 503으로 처리한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError('Network unavailable'))
			.mockRejectedValueOnce(new DOMException('Request timed out', 'TimeoutError'));
		vi.stubGlobal('fetch', fetchMock);

		const networkResponse = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});
		const timeoutResponse = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(networkResponse.status).toBe(503);
		expect(timeoutResponse.status).toBe(503);
	});

	it('잘못된 성공 응답은 503을 반환한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { content: '잘못된 본문' } })));

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(response.status).toBe(503);
	});

	it('author 배열이 포함된 성공 응답은 503을 반환한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: {
						title: '게시글 제목',
						content: [],
						publishedAt: '2026-09-01T00:00:00',
						owner: { slug: 'actual' },
						author: [],
					},
				}),
			),
		);

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});

		expect(response.status).toBe(503);
	});
});
