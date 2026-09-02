import { describe, expect, it } from 'vitest';

import { mapBlogChapterResponse } from './map-blog-chapter-response';

describe('mapBlogChapterResponse', () => {
	it('챕터 목록 DTO를 게시 설정 select 옵션으로 변환한다', () => {
		expect(
			mapBlogChapterResponse([
				{ chapterId: 7, name: '프론트엔드', order: 0 },
				{ chapterId: 12, name: '회고', order: 1 },
			]),
		).toEqual([
			{ value: '7', label: '프론트엔드' },
			{ value: '12', label: '회고' },
		]);
	});
});
