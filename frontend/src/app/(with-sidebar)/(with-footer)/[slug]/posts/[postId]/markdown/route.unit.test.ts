import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('게시글 Markdown 표현', () => {
	it('API owner slug를 canonical에 사용하고 제목을 안전하게 직렬화한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: {
						title: '줄바꿈\n제목 " 인용',
						content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }],
						author: { nickname: '작성자' },
						owner: { slug: 'actual' },
						category: '기술',
						publishedAt: '2026-09-01T00:00:00',
					},
				}),
			),
		);

		const response = await GET(new Request('https://www.rilog.kr/@actual/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@actual', postId: '1' }),
		});
		const markdown = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get('Link')).toBe('<https://www.rilog.kr/@actual/posts/1>; rel="canonical"');
		expect(markdown).toContain('title: "줄바꿈\\n제목 \\" 인용"');
	});

	it('다른 블로그 slug의 요청은 게시글을 노출하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(Response.json({ data: { content: [], owner: { slug: 'actual' } } })),
		);

		const response = await GET(new Request('https://www.rilog.kr/@wrong/posts/1/markdown'), {
			params: Promise.resolve({ slug: '@wrong', postId: '1' }),
		});

		expect(response.status).toBe(404);
	});
});
