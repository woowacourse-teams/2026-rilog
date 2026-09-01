import { describe, expect, it } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { publicBlogPostsQueryOptions } from './query-options';

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
});
