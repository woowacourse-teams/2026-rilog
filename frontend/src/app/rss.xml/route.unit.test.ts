import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('rss.xml', () => {
	it('피드 API 오류를 빈 RSS로 응답하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })));

		const response = await GET();

		expect(response.status).toBe(503);
	});

	it('작성자 이름을 RSS author 이메일 필드 대신 creator로 제공한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: {
						posts: [
							{
								postId: 1,
								title: '게시글',
								publishedAt: '2026-09-01T00:00:00',
								author: { nickname: '작성자', slug: 'writer' },
								owner: { slug: 'owner' },
								category: '기술',
							},
						],
					},
				}),
			),
		);

		const xml = await (await GET()).text();

		expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"');
		expect(xml).toContain('<dc:creator>작성자</dc:creator>');
		expect(xml).not.toContain('<author>작성자</author>');
		expect(xml).toContain('<pubDate>Tue, 01 Sep 2026 00:00:00 GMT</pubDate>');
	});
});
