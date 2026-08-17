import { describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post-feed';

import { deduplicatePostFeedItems } from './deduplicate-post-feed-items';

const createItem = (id: number): PostFeedItem => ({
	id,
	title: `글 ${id}`,
	thumbnailUrl: null,
	publishedAt: '2026-08-14T09:00:00',
	author: { nickname: '작성자', slug: 'author', profileImageUrl: null },
	colog: null,
});

describe('deduplicatePostFeedItems', () => {
	it('페이지 경계에서 같은 postId가 다시 와도 최초 항목만 유지한다', () => {
		const first = createItem(1);
		const duplicate = { ...createItem(1), title: '중복 글' };
		const second = createItem(2);

		expect(deduplicatePostFeedItems([first, duplicate, second])).toEqual([first, second]);
	});
});
