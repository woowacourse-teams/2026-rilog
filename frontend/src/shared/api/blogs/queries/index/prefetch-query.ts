import type { QueryClient } from '@tanstack/react-query';

import { blogIndexQueryOptions } from './query-options';

export const prefetchBlogIndexQuery = (queryClient: QueryClient, slug: string) =>
	queryClient.prefetchQuery(blogIndexQueryOptions(slug));
