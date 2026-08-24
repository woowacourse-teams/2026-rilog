import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostDetailResponse } from '@/shared/api/posts/types';

import { mapPostDetailToEditorDocument } from './map-post-detail-to-editor-document';

const createResponse = (content: unknown): PostDetailResponse => ({
	title: '수정할 제목',
	content,
	publishedAt: '2026-08-24T00:00:00Z',
	thumbnailImageUrl: null,
	category: 'TECH',
	author: { userId: 7, nickname: '작성자', slug: 'author', profileImageUrl: null },
	owner: { type: 'RILOG', blogId: 3, slug: 'author', name: '작성자', profileImageUrl: null },
});

describe('mapPostDetailToEditorDocument', () => {
	it('게시글 제목과 BlockNote 본문을 편집 초기값으로 변환한다', () => {
		const blocks = [{ id: 'paragraph', type: 'paragraph', content: [] }] as unknown as Block[];

		expect(mapPostDetailToEditorDocument(createResponse(blocks))).toEqual({
			title: '수정할 제목',
			blocks,
		});
	});

	it('본문이 배열이 아니면 안전하게 빈 본문을 사용한다', () => {
		expect(mapPostDetailToEditorDocument(createResponse(null)).blocks).toEqual([]);
	});
});
