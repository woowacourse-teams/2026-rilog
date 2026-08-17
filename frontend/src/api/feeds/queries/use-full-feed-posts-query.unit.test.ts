import { describe, expect, it, vi } from 'vitest';

import { readFullFeedPosts } from '../feeds.apis';
import { feedsKeys } from '../feeds.keys';

import { fullFeedPostsInfiniteQueryOptions } from './use-full-feed-posts-query';

vi.mock('../feeds.apis', () => ({
	readFullFeedPosts: vi.fn(),
}));

describe('fullFeedPostsInfiniteQueryOptions', () => {
	it('0번 페이지부터 요청하고 응답 page와 hasNext로 다음 페이지를 계산한다', async () => {
		vi.mocked(readFullFeedPosts).mockResolvedValue({
			data: { page: 0, size: 12, numberOfElements: 0, hasNext: false, posts: [] },
		});
		const options = fullFeedPostsInfiniteQueryOptions({ size: 12 });

		expect(options.queryKey).toEqual(feedsKeys.fullPosts(12));
		expect(options.initialPageParam).toBe(0);

		await options.queryFn?.({ pageParam: 0 } as never);
		expect(readFullFeedPosts).toHaveBeenCalledWith({ page: 0, size: 12 });

		expect(options.getNextPageParam?.({ data: { page: 3, hasNext: true } }, [], 3, [])).toBe(4);
		expect(options.getNextPageParam?.({ data: { page: 3, hasNext: false } }, [], 3, [])).toBeUndefined();
	});
});
