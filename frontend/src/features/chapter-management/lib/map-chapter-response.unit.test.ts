import { describe, expect, it } from 'vitest';

import type { ChapterResponse } from '@/shared/api/blogs/types';

import { mapChapterResponses } from './map-chapter-response';

describe('mapChapterResponses', () => {
	it('챕터 응답을 order 순서의 화면 모델로 변환한다', () => {
		const responses: ChapterResponse[] = [
			{ chapterId: 2, name: '백엔드', order: 1 },
			{ chapterId: 1, name: '프론트엔드', order: 0 },
		];

		expect(mapChapterResponses(responses)).toEqual([
			{ id: 1, name: '프론트엔드' },
			{ id: 2, name: '백엔드' },
		]);
		expect(responses.map((response) => response.chapterId)).toEqual([2, 1]);
	});
});
