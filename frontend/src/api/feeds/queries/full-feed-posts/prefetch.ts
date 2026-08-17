import type { QueryClient } from '@tanstack/react-query';

import { fullFeedPostsQueryOptions } from './query-options';

export const prefetch = (queryClient: QueryClient, size?: number) =>
	queryClient.prefetchInfiniteQuery(fullFeedPostsQueryOptions({ size }));
