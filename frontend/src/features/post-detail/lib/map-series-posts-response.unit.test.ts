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
		numberOfElements: 1,
		hasNext: false,
	},
};

describe('mapSeriesPostsResponse', () => {
	it('시리즈 정보와 게시글 목록을 아코디언 모델로 변환한다', () => {
		expect(mapSeriesPostsResponse(RESPONSE, { id: 3, name: 'Next.js로 블로그 만들기', order: 1 })).toEqual({
			id: 3,
			name: 'Next.js로 블로그 만들기',
			postCount: 1,
			posts: [{ id: 65, title: '프로젝트 구조와 App Router 설계' }],
		});
	});

	it('응답 데이터가 없으면 명시적으로 실패한다', () => {
		expect(() => mapSeriesPostsResponse({ status: 200, message: '성공' }, { id: 3, name: '시리즈', order: 1 })).toThrow(
			'시리즈 게시글 응답에 데이터가 없습니다.',
		);
	});
});
