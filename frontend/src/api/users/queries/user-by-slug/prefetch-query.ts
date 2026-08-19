import type { QueryClient } from '@tanstack/react-query';

import { userBySlugQueryOptions } from './query-options';

export const prefetchUserBySlugQuery = (queryClient: QueryClient, slug: string) =>
	queryClient.prefetchQuery(userBySlugQueryOptions(slug));
