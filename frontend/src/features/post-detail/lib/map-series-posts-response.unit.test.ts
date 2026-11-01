import { describe, expect, it } from 'vitest';

import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapSeriesPostsResponse } from './map-series-posts-response';

const RESPONSE: ApiResponse<PublicBlogFeedPostResponse> = {
	status: 200,
	message: '성공',
	data: {
		type: 'RILOG',
		posts: [
			{
				postId: 65,
				title: '프로젝트 구조와 App Router 설계',
				thumbnailImageUrl: null,
				category: '기술',
				chapter: { chapterId: 3, name: 'Next.js로 블로그 만들기', order: 1 },
				visibility: 'PUBLIC',
				publishedAt: '2026-09-01T00:00:00+09:00',
				totalCommentsCount: 0,
				author: { userId: 1, nickname: '리로거', slug: 'rilogger', profileImageUrl: null },
				owner: {
					type: 'RILOG',
					blogId: 1,
					slug: 'rilogger',
					name: '리로거',
					profileImageUrl: null,
				},
			},
			{
				postId: 12,
				title: '시리즈 다음 글',
				thumbnailImageUrl: null,
				category: '기술',
				chapter: { chapterId: 3, name: 'Next.js로 블로그 만들기', order: 1 },
				visibility: 'PUBLIC',
				publishedAt: '2026-09-02T00:00:00+09:00',
				totalCommentsCount: 0,
				author: { userId: 1, nickname: '리로거', slug: 'rilogger', profileImageUrl: null },
				owner: {
					type: 'RILOG',
					blogId: 1,
					slug: 'rilogger',
					name: '리로거',
					profileImageUrl: null,
				},
			},
		],
		page: 0,
		size: 30,
		numberOfElements: 2,
		hasNext: false,
	},
};

describe('mapSeriesPostsResponse', () => {
	it('시리즈 정보와 오래된 글부터 받은 순서를 유지해 아코디언 모델로 변환한다', () => {
		expect(mapSeriesPostsResponse(RESPONSE, { id: 3, name: 'Next.js로 블로그 만들기', order: 1 })).toEqual({
			id: 3,
			name: 'Next.js로 블로그 만들기',
			postCount: 2,
			posts: [
				{ id: 65, title: '프로젝트 구조와 App Router 설계' },
				{ id: 12, title: '시리즈 다음 글' },
			],
		});
	});

	it('응답 데이터가 없으면 명시적으로 실패한다', () => {
		expect(() => mapSeriesPostsResponse({ status: 200, message: '성공' }, { id: 3, name: '시리즈', order: 1 })).toThrow(
			'시리즈 게시글 응답에 데이터가 없습니다.',
		);
	});
});
