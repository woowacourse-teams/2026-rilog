import { describe, expect, it } from 'vitest';

import type { FullFeedPostResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapFullFeedPostResponse } from './map-full-feed-post-response';

describe('mapFullFeedPostResponse', () => {
	it('실제 응답의 author.name과 owner.type 구조를 올바르게 매핑한다', () => {
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
						thumbnailImageUrl: '',
						category: 'TECH',
						visibility: 'PUBLIC',
						publishedAt: '2026-08-17T00:00:00',
						author: { userId: 10, name: '리로', slug: 'riro', profileImageUrl: '' },
						owner: { type: 'RILOG' as const, blogId: 10, name: '리로', slug: 'riro', profileImageUrl: '' },
					},
					{
						postId: 2,
						title: '팀 글',
						thumbnailImageUrl: '',
						category: 'TECH',
						visibility: 'PUBLIC',
						publishedAt: '2026-08-17T00:00:00',
						author: { userId: 10, name: '리로', slug: 'riro', profileImageUrl: '' },
						owner: {
							type: 'COLOG' as const,
							blogId: 20,
							name: '리로그 팀',
							slug: 'rilog',
							profileImageUrl: 'https://images.rilog.test/team.png',
							coverImageUrl: '',
							memberCount: 7,
							postCount: 3,
						},
					},
				],
			},
		} satisfies ApiResponse<FullFeedPostResponse>;

		const page = mapFullFeedPostResponse(response, 0);

		expect(page.items[0]).toMatchObject({
			author: { id: 10, nickname: '리로', slug: 'riro' },
			blog: { id: 10, name: '리로', slug: 'riro', type: 'RILOG' },
		});
		expect(page.items[1]).toMatchObject({
			author: { id: 10, nickname: '리로', slug: 'riro' },
			blog: {
				id: 20,
				name: '리로그 팀',
				slug: 'rilog',
				type: 'COLOG',
				profileImageUrl: 'https://images.rilog.test/team.png',
			},
		});
	});
});
