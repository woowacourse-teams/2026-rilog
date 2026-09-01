import { describe, expect, it } from 'vitest';

import type { PostDetailResponse } from '@/shared/api/posts/types';

import { mapPostDetailToPostWriteInitialData } from './map-post-detail-to-post-write-initial-data';

const createResponse = (overrides: Partial<PostDetailResponse> = {}): PostDetailResponse => ({
	title: '수정할 제목',
	content: [{ id: 'paragraph', type: 'paragraph', content: [] }],
	publishedAt: '2026-08-24T00:00:00Z',
	thumbnailImageUrl: 'posts/existing-thumbnail.png',
	category: 'DAILY',
	author: { userId: 7, nickname: '작성자', slug: 'author', profileImageUrl: null },
	owner: { type: 'RILOG', blogId: 3, slug: 'author', name: '작성자 블로그', profileImageUrl: null },
	...overrides,
});

describe('mapPostDetailToPostWriteInitialData', () => {
	it('상세 응답의 문서, 작성자와 게시 설정을 편집 초기값으로 변환한다', () => {
		const response = createResponse();

		expect(mapPostDetailToPostWriteInitialData(response)).toEqual({
			authorId: 7,
			document: {
				title: '수정할 제목',
				blocks: response.content,
			},
			settings: {
				category: 'DAILY',
				blog: { type: 'RILOG', slug: 'author' },
				representativeImage: null,
				representativeImageUrl: 'posts/existing-thumbnail.png',
			},
		});
	});

	it.each([
		['TECH', 'IT'],
		['기술', 'IT'],
		['DAILY', 'DAILY'],
		['일상', 'DAILY'],
	] as const)('API 카테고리 %s를 편집 카테고리 %s로 변환한다', (category, expectedCategory) => {
		expect(mapPostDetailToPostWriteInitialData(createResponse({ category })).settings.category).toBe(expectedCategory);
	});

	it('본문이 배열이 아니면 안전하게 빈 본문을 사용한다', () => {
		expect(mapPostDetailToPostWriteInitialData(createResponse({ content: null })).document.blocks).toEqual([]);
	});
});
