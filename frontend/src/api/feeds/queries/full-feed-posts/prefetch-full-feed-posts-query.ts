import type { QueryClient } from '@tanstack/react-query';

import { fullFeedPostsQueryOptions } from './full-feed-posts-query-options';

export const prefetchFullFeedPostsQuery = (queryClient: QueryClient, size?: number) =>
	queryClient.prefetchInfiniteQuery(fullFeedPostsQueryOptions({ size }));
