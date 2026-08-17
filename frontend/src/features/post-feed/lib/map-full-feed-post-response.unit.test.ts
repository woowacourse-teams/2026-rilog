import { describe, expect, it } from 'vitest';

import { mapFullFeedPostResponse } from './map-full-feed-post-response';

describe('mapFullFeedPostResponse', () => {
	it('blog id와 user id가 다를 때만 팀 블로그 배지 정보를 만든다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: {
				page: 0,
				size: 12,
				numberOfElements: 2,
				hasNext: false,
				posts: [
					{
						postId: 1,
						title: '개인 글',
						thumbnailUrl: '',
						category: 'TECH',
						visibility: 'PUBLIC',
						publishedAt: '2026-08-17T00:00:00',
						user: { userId: 10, nickname: '리로', slug: 'riro', profileImageUrl: '' },
						blog: { blogId: 10, name: '리로', slug: 'riro', profileUrl: '' },
					},
					{
						postId: 2,
						title: '팀 글',
						thumbnailUrl: '',
						category: 'TECH',
						visibility: 'PUBLIC',
						publishedAt: '2026-08-17T00:00:00',
						user: { userId: 10, nickname: '리로', slug: 'riro', profileImageUrl: '' },
						blog: { blogId: 20, name: '리로그 팀', slug: 'rilog', profileUrl: '' },
					},
				],
			},
		};

		const page = mapFullFeedPostResponse(response, 0);

		expect(page.items[0]).toMatchObject({ author: { slug: 'riro' }, colog: null });
		expect(page.items[1]).toMatchObject({
			author: { slug: 'riro' },
			colog: { name: '리로그 팀', slug: 'rilog', logoUrl: null },
		});
	});
});
