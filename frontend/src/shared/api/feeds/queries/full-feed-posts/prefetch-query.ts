import type { QueryClient } from '@tanstack/react-query';

import { fullFeedPostsQueryOptions, type FullFeedPostsQueryOptions } from './query-options';

export const prefetchFullFeedPostsQuery = (queryClient: QueryClient, options?: FullFeedPostsQueryOptions) =>
	queryClient.prefetchInfiniteQuery(fullFeedPostsQueryOptions(options));
