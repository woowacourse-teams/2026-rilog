import { describe, expect, it } from 'vitest';

import type { PostItemResponse, PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapPublicBlogPosts } from './map-public-blog-posts';

const POST: PostItemResponse = {
	postId: 1,
	title: '코로그 기록',
	thumbnailImageUrl: null,
	category: 'IT',
	chapter: null,
	visibility: 'PUBLIC',
	publishedAt: '2026-09-08T00:00:00',
	author: { userId: 10, name: '리로', slug: 'riro', profileImageUrl: null },
	owner: {
		type: 'COLOG',
		blogId: 20,
		name: '리로그 팀',
		slug: 'rilog-team',
		profileImageUrl: null,
		coverImageUrl: null,
		memberCount: 3,
		postCount: 1,
	},
};

describe('mapPublicBlogPosts', () => {
	it.each([
		{ chapter: { chapterId: 3, name: '개발 기록', order: 1 }, expectedName: '개발 기록' },
		{ chapter: null, expectedName: null },
	])('챕터 $expectedName 및 카테고리를 블로그 목록에 전달한다', ({ chapter, expectedName }) => {
		const response: ApiResponse<PublicBlogFeedPostResponse> = {
			status: 200,
			message: 'OK',
			data: {
				type: 'COLOG',
				posts: [{ ...POST, chapter }],
				page: 0,
				size: 12,
				numberOfElements: 1,
				hasNext: false,
			},
		};

		expect(mapPublicBlogPosts(response, 0).items).toEqual([
			expect.objectContaining({ chapterName: expectedName, categoryLabel: 'IT' }),
		]);
	});
});
