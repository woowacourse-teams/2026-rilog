import { describe, expect, it } from 'vitest';

import { mapPostCategoryResponse } from './map-post-category-response';

describe('mapPostCategoryResponse', () => {
	it.each([
		['기술', 'TECH'],
		['일상', 'DAILY'],
		['회고', 'RETROSPECT'],
	] as const)('API 카테고리 %s를 게시글 카테고리 %s로 변환한다', (category, expectedCategory) => {
		expect(mapPostCategoryResponse(category)).toBe(expectedCategory);
	});
});
