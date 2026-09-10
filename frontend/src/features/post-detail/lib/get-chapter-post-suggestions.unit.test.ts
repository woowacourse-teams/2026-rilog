import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readPublicBlogPosts } from '@/shared/api/blogs/api';

import { getChapterPostSuggestions } from './get-chapter-post-suggestions';

vi.mock('@/shared/api/blogs/api');

const CHAPTER = { id: 7, name: '프론트엔드', order: 1 };

describe('getChapterPostSuggestions', () => {
	beforeEach(() => {
		vi.mocked(readPublicBlogPosts).mockReset();
	});

	it('page 0, size 3과 chapterId를 고정해 챕터 게시글을 조회한다', async () => {
		vi.mocked(readPublicBlogPosts).mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				type: 'COLOG',
				posts: [],
				page: 0,
				size: 3,
				numberOfElements: 0,
				hasNext: false,
			},
		});

		await getChapterPostSuggestions({ slug: '@rilog-team', chapter: CHAPTER });

		expect(readPublicBlogPosts).toHaveBeenCalledWith({
			slug: '@rilog-team',
			page: 0,
			size: 3,
			filter: { type: 'chapterId', chapterId: 7 },
		});
	});

	it('추천 조회가 실패하면 게시글 상세를 유지하기 위해 null을 반환한다', async () => {
		vi.mocked(readPublicBlogPosts).mockRejectedValue(new Error('network error'));

		await expect(getChapterPostSuggestions({ slug: 'rilog-team', chapter: CHAPTER })).resolves.toBeNull();
	});
});
