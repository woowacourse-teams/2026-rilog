import { describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post';

import { deduplicatePostFeedItems } from './deduplicate-post-feed-items';

const createPostItem = (id: number): PostFeedItem => ({
	id,
	title: `게시글 ${id}`,
	thumbnailUrl: null,
	publishedAt: '2026-08-16',
	author: { id: 1, nickname: '리로', slug: 'riro', profileImageUrl: null },
	blog: { id: 1, name: '리로', slug: 'riro', type: 'RILOG', profileImageUrl: null },
});

describe('deduplicatePostFeedItems', () => {
	it('중복된 id를 가진 게시글을 제거하고 첫 번째 항목 순서를 유지한다', () => {
		const duplicatedItems = [createPostItem(1), createPostItem(2), createPostItem(1), createPostItem(3)];

		expect(deduplicatePostFeedItems(duplicatedItems)).toEqual([
			createPostItem(1),
			createPostItem(2),
			createPostItem(3),
		]);
	});

	it('중복이 없으면 원본과 동일한 배열을 반환한다', () => {
		const uniqueItems = [createPostItem(1), createPostItem(2)];

		expect(deduplicatePostFeedItems(uniqueItems)).toEqual(uniqueItems);
	});
});
