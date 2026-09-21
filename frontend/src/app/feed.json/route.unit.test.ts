import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('feed.json', () => {
	it('피드 API 오류를 빈 피드로 응답하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })));

		const response = await GET();

		expect(response.status).toBe(503);
	});

	it('API의 시간대 없는 UTC 게시일을 UTC로 직렬화한다', async () => {
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

		const response = await GET();
		const feed = (await response.json()) as {
			version: string;
			items: { date_published: string; content_text: string }[];
		};

		expect(feed.version).toBe('https://jsonfeed.org/version/1.1');
		expect(feed.items[0].date_published).toBe('2026-09-01T00:00:00.000Z');
		expect(feed.items[0].content_text).toBe('게시글');
	});
});
