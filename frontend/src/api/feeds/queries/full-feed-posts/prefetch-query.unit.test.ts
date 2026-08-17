import { describe, expect, it, vi } from 'vitest';

import { prefetchFullFeedPostsQuery } from './prefetch-query';

describe('prefetchFullFeedPostsQuery', () => {
	it('전달받은 QueryClient에 공용 query options로 prefetch한다', async () => {
		const prefetchInfiniteQuery = vi.fn().mockResolvedValue(undefined);
		const queryClient = { prefetchInfiniteQuery };

		await prefetchFullFeedPostsQuery(queryClient as never);

		expect(prefetchInfiniteQuery).toHaveBeenCalledOnce();
		expect(prefetchInfiniteQuery.mock.calls[0]?.[0]).toMatchObject({
			queryKey: ['feeds', 'posts', 'full', { size: 12 }],
			initialPageParam: 0,
		});
	});
});
