import { describe, expect, it } from 'vitest';

import { mapBlogIndexResponse } from './map-blog-index-response';

describe('mapBlogIndexResponse', () => {
	it('인덱스 DTO를 UI 모델로 변환하고 blank 이미지는 fallback 가능한 null로 만든다', () => {
		expect(
			mapBlogIndexResponse({
				blogType: 'RILOG',
				totalCount: 8,
				chapterIndexes: [{ chapterId: 3, name: '회고', postCount: 5 }],
				cologIndexes: [
					{
						cologId: 7,
						slug: '@rilog-team',
						name: '리로그 팀',
						profileImageUrl: '   ',
						authoredPostCount: 3,
					},
				],
			}),
		).toEqual({
			totalCount: 8,
			chapterIndexes: [{ id: 3, name: '회고', postCount: 5 }],
			cologIndexes: [{ id: 7, slug: 'rilog-team', name: '리로그 팀', profileImageUrl: null, postCount: 3 }],
		});
	});

	it('nullable 인덱스 배열을 빈 목록으로 변환한다', () => {
		expect(
			mapBlogIndexResponse({
				blogType: 'COLOG',
				totalCount: 0,
				chapterIndexes: null,
				cologIndexes: null,
			}),
		).toEqual({ totalCount: 0, chapterIndexes: [], cologIndexes: [] });
	});
});
