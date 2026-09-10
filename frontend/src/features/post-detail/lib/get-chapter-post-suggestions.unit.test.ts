import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readPublicBlogPosts } from '@/shared/api/blogs/api';
import type { PostItemResponse } from '@/shared/api/blogs/types';

import { getChapterPostSuggestions } from './get-chapter-post-suggestions';

vi.mock('@/shared/api/blogs/api');

const CHAPTER = { id: 7, name: '프론트엔드', order: 1 };
const createPostResponse = (postId: number): PostItemResponse => ({
	postId,
	title: `게시글 ${postId}`,
	thumbnailImageUrl: null,
	category: '기술',
	chapter: { chapterId: 7, name: '프론트엔드', order: 1 },
	visibility: 'PUBLIC',
	publishedAt: '2026-09-01T00:00:00+09:00',
	author: { userId: postId, nickname: `작성자 ${postId}`, slug: `author-${postId}`, profileImageUrl: null },
	owner: {
		type: 'COLOG',
		blogId: 1,
		slug: 'rilog-team',
		name: '리로그 팀',
		profileImageUrl: null,
	},
});

describe('getChapterPostSuggestions', () => {
	beforeEach(() => {
		vi.mocked(readPublicBlogPosts).mockReset();
	});

	it('4개를 조회하고 상위 3개만 반환한다', async () => {
		vi.mocked(readPublicBlogPosts).mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				type: 'COLOG',
				posts: [createPostResponse(1), createPostResponse(2), createPostResponse(3), createPostResponse(4)],
				page: 0,
				size: 4,
				numberOfElements: 4,
				hasNext: false,
			},
		});

		const suggestions = await getChapterPostSuggestions({
			slug: '@rilog-team',
			chapter: CHAPTER,
			currentPostId: 65,
		});

		expect(readPublicBlogPosts).toHaveBeenCalledWith({
			slug: '@rilog-team',
			page: 0,
			size: 4,
			filter: { type: 'chapterId', chapterId: 7 },
		});
		expect(suggestions?.posts.map((post) => post.id)).toEqual([1, 2, 3]);
	});

	it('현재 글을 제외한 뒤 남아 있는 게시글 순서를 유지한다', async () => {
		vi.mocked(readPublicBlogPosts).mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				type: 'COLOG',
				posts: [createPostResponse(1), createPostResponse(65), createPostResponse(2), createPostResponse(3)],
				page: 0,
				size: 4,
				numberOfElements: 4,
				hasNext: false,
			},
		});

		const suggestions = await getChapterPostSuggestions({
			slug: '@rilog-team',
			chapter: CHAPTER,
			currentPostId: 65,
		});

		expect(suggestions?.posts.map((post) => post.id)).toEqual([1, 2, 3]);
	});

	it('추천 조회가 실패하면 게시글 상세를 유지하기 위해 null을 반환한다', async () => {
		vi.mocked(readPublicBlogPosts).mockRejectedValue(new Error('network error'));

		await expect(
			getChapterPostSuggestions({ slug: 'rilog-team', chapter: CHAPTER, currentPostId: 65 }),
		).resolves.toBeNull();
	});
});
