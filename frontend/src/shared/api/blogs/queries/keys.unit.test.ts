import { describe, expect, it } from 'vitest';

import { blogsQueryKeys } from './keys';

describe('blogsQueryKeys', () => {
	it('slug와 목록 filter를 각 조회 cache에 포함한다', () => {
		expect(blogsQueryKeys.publicProfile('rilog')).toEqual(['blogs', 'public-profile', 'rilog']);
		expect(blogsQueryKeys.index('rilog')).toEqual(['blogs', 'index', 'rilog']);
		expect(blogsQueryKeys.chapters('rilog')).toEqual(['blogs', 'chapters', 'rilog']);
		expect(blogsQueryKeys.publicBlogPostsFilter('rilog', { type: 'chapterId', chapterId: 12 })).toEqual([
			'blogs',
			'public-posts',
			'rilog',
			{ type: 'chapterId', chapterId: 12 },
		]);
	});
});
