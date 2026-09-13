import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readPublicBlogPosts } from '@/shared/api/blogs/api';

import { getSeriesPosts } from './get-series-posts';

vi.mock('@/shared/api/blogs/api');

const CHAPTER = { id: 3, name: 'Next.js로 블로그 만들기', order: 1 };

describe('getSeriesPosts', () => {
	beforeEach(() => {
		vi.mocked(readPublicBlogPosts).mockReset();
	});

	it('page 0, size 30과 chapterId를 고정해 시리즈 게시글을 조회한다', async () => {
		vi.mocked(readPublicBlogPosts).mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				type: 'RILOG',
				posts: [],
				page: 0,
				size: 30,
				numberOfElements: 0,
				hasNext: false,
			},
		});

		await getSeriesPosts({ slug: '@rilog-team', chapter: CHAPTER });

		expect(readPublicBlogPosts).toHaveBeenCalledWith({
			slug: '@rilog-team',
			page: 0,
			size: 30,
			filter: { type: 'chapterId', chapterId: 3 },
		});
	});

	it('부가적인 시리즈 조회가 실패하면 게시글 상세를 위해 null을 반환한다', async () => {
		vi.mocked(readPublicBlogPosts).mockRejectedValue(new Error('network error'));

		await expect(getSeriesPosts({ slug: 'rilog-team', chapter: CHAPTER })).resolves.toBeNull();
	});
});
