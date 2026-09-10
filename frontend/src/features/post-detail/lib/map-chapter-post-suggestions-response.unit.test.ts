import { describe, expect, it } from 'vitest';

import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapChapterPostSuggestionsResponse } from './map-chapter-post-suggestions-response';

const RESPONSE: ApiResponse<PublicBlogFeedPostResponse> = {
	status: 200,
	message: '성공',
	data: {
		type: 'COLOG',
		posts: [
			{
				postId: 65,
				title: '서버 컴포넌트 설계',
				thumbnailImageUrl: null,
				category: 'TECH',
				chapter: { chapterId: 7, name: '프론트엔드', order: 1 },
				visibility: 'PUBLIC',
				publishedAt: '2026-09-01T00:00:00+09:00',
				author: { userId: 1, name: '리로거', slug: 'rilogger', profileImageUrl: null },
				owner: {
					type: 'COLOG',
					blogId: 1,
					slug: 'rilog-team',
					name: '리로그 팀',
					profileImageUrl: null,
					coverImageUrl: null,
					memberCount: 3,
					postCount: 10,
				},
			},
		],
		page: 0,
		size: 3,
		numberOfElements: 1,
		hasNext: false,
	},
};

describe('mapChapterPostSuggestionsResponse', () => {
	it('챕터 정보와 게시글 응답을 추천 모델로 변환한다', () => {
		expect(mapChapterPostSuggestionsResponse(RESPONSE, { id: 7, name: '프론트엔드', order: 1 })).toEqual({
			id: 7,
			name: '프론트엔드',
			posts: [
				{
					id: 65,
					title: '서버 컴포넌트 설계',
					thumbnailUrl: null,
					author: { slug: 'rilogger', nickname: '리로거' },
				},
			],
		});
	});

	it('응답 데이터가 없으면 명시적으로 실패한다', () => {
		expect(() =>
			mapChapterPostSuggestionsResponse({ status: 200, message: '성공' }, { id: 7, name: '프론트엔드', order: 1 }),
		).toThrow('챕터 추천 게시글 응답에 데이터가 없습니다.');
	});
});
