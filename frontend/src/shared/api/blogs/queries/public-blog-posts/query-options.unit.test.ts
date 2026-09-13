import { describe, expect, it, vi } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { publicBlogPostsQueryOptions } from './query-options';

const { readPublicBlogPostsMock } = vi.hoisted(() => ({ readPublicBlogPostsMock: vi.fn() }));

vi.mock('../../api', () => ({ readPublicBlogPosts: readPublicBlogPostsMock }));

describe('publicBlogPostsQueryOptions', () => {
	it('필터별 leaf key를 부모 게시글 key 아래에 둔다', () => {
		const allFilter = { type: 'all' } as const;
		const chapterFilter = { type: 'chapterId', chapterId: 3 } as const;

		expect(publicBlogPostsQueryOptions({ slug: 'rilog', filter: allFilter }).queryKey).toEqual(
			blogsQueryKeys.publicBlogPostsFilter('rilog', allFilter),
		);
		expect(publicBlogPostsQueryOptions({ slug: 'rilog', filter: chapterFilter }).queryKey).toEqual(
			blogsQueryKeys.publicBlogPostsFilter('rilog', chapterFilter),
		);
		expect(blogsQueryKeys.publicBlogPostsFilter('rilog', chapterFilter).slice(0, -1)).toEqual(
			blogsQueryKeys.publicBlogPosts('rilog'),
		);
	});

	it('페이지와 Colog 필터를 공개 게시글 API에 전달한다', async () => {
		readPublicBlogPostsMock.mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { type: 'RILOG', posts: [], page: 2, size: 12, numberOfElements: 0, hasNext: false },
		});
		const filter = { type: 'targetCologSlug', targetCologSlug: 'rilog-team' } as const;
		const options = publicBlogPostsQueryOptions({ slug: 'jetproc', filter });

		await options.queryFn?.({ pageParam: 2 } as never);

		expect(readPublicBlogPostsMock).toHaveBeenCalledWith({
			slug: 'jetproc',
			page: 2,
			size: 12,
			filter,
		});
	});
});
