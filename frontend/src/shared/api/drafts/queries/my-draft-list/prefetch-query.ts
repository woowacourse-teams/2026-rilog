import type { QueryClient } from '@tanstack/react-query';

import { myDraftListQueryOptions } from './query-options';

export const prefetchMyDraftListQuery = (
	queryClient: QueryClient,
	options?: Parameters<typeof myDraftListQueryOptions>[0],
) => queryClient.prefetchInfiniteQuery(myDraftListQueryOptions(options));
