import type { QueryClient } from '@tanstack/react-query';

import { blogChaptersQueryOptions } from './query-options';

export const prefetchBlogChaptersQuery = (queryClient: QueryClient, slug: string) =>
	queryClient.prefetchQuery(blogChaptersQueryOptions(slug));
