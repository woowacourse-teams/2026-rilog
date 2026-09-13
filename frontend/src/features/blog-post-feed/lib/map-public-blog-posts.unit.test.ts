import { describe, expect, it } from 'vitest';

import type { PostItemResponse, PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapPublicBlogPosts } from './map-public-blog-posts';

const POST: PostItemResponse = {
	postId: 1,
	title: '코로그 기록',
	thumbnailImageUrl: null,
	category: '기술',
	chapter: null,
	visibility: 'PUBLIC',
	publishedAt: '2026-09-08T00:00:00',
	author: { userId: 10, nickname: '리로', slug: 'riro', profileImageUrl: null },
	owner: {
		type: 'COLOG',
		blogId: 20,
		name: '리로그 팀',
		slug: 'rilog-team',
		profileImageUrl: null,
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
			expect.objectContaining({ chapterName: expectedName, categoryLabel: '기술' }),
		]);
	});

	it.each(['RILOG', 'COLOG'] as const)('%s owner를 공통 블로그 모델로 변환한다', (type) => {
		const response: ApiResponse<PublicBlogFeedPostResponse> = {
			status: 200,
			message: 'OK',
			data: {
				type,
				posts: [{ ...POST, owner: { ...POST.owner, type } }],
				page: 0,
				size: 12,
				numberOfElements: 1,
				hasNext: false,
			},
		};

		expect(mapPublicBlogPosts(response, 0).items[0]?.blog).toEqual({
			id: 20,
			name: '리로그 팀',
			slug: 'rilog-team',
			type,
			profileImageUrl: null,
		});
	});

	it('nickname이 공백뿐인 계약 위반 게시글은 목록에서 제외한다', () => {
		const response: ApiResponse<PublicBlogFeedPostResponse> = {
			status: 200,
			message: 'OK',
			data: {
				type: 'RILOG',
				posts: [{ ...POST, author: { ...POST.author, nickname: '   ' } }],
				page: 0,
				size: 12,
				numberOfElements: 1,
				hasNext: false,
			},
		};

		expect(mapPublicBlogPosts(response, 0).items).toEqual([]);
	});
});
