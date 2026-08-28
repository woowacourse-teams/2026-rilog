import type { QueryClient } from '@tanstack/react-query';

import { draftDetailQueryOptions } from './query-options';

export const prefetchDraftDetailQuery = (queryClient: QueryClient, draftId: number) =>
	queryClient.prefetchQuery(draftDetailQueryOptions(draftId));
