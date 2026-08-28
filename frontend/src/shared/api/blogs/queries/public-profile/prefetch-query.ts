import type { QueryClient } from '@tanstack/react-query';

import { blogPublicProfileQueryOptions } from './query-options';

export const prefetchBlogPublicProfileQuery = (queryClient: QueryClient, slug: string) =>
	queryClient.prefetchQuery(blogPublicProfileQueryOptions(slug));
