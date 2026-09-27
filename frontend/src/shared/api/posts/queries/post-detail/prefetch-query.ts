import type { QueryClient } from '@tanstack/react-query';

import { postDetailQueryOptions } from './query-options';

export const prefetchPostDetailQuery = (queryClient: QueryClient, slug: string, postId: number) =>
	queryClient.prefetchQuery(postDetailQueryOptions(slug, postId));
