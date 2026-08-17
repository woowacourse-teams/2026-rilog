import { describe, expect, it, vi } from 'vitest';

import { readFullFeedPosts } from '../../api';
import { keys } from '../keys';

import { fullFeedPostsQueryOptions } from './query-options';

vi.mock('../../api', () => ({
	readFullFeedPosts: vi.fn(),
}));

describe('fullFeedPostsQueryOptions', () => {
	it('query와 prefetch가 공유할 pagination 설정과 query key를 제공한다', async () => {
		vi.mocked(readFullFeedPosts).mockResolvedValue({
			data: { page: 0, size: 12, numberOfElements: 0, hasNext: false, posts: [] },
		});
		const options = fullFeedPostsQueryOptions();

		expect(options.queryKey).toEqual(keys.fullPosts(12));
		expect(options.initialPageParam).toBe(0);

		await options.queryFn?.({ pageParam: 0 } as never);
		expect(readFullFeedPosts).toHaveBeenCalledWith({ page: 0, size: 12 });
		expect(
			options.getNextPageParam?.(
				{ data: { page: 2, size: 12, numberOfElements: 0, posts: [], hasNext: true } },
				[],
				2,
				[],
			),
		).toBe(3);
		expect(
			options.getNextPageParam?.(
				{ data: { page: 2, size: 12, numberOfElements: 0, posts: [], hasNext: false } },
				[],
				2,
				[],
			),
		).toBeUndefined();
	});
});
