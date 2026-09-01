import type { QueryClient } from '@tanstack/react-query';

import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

import { publicBlogPostsQueryOptions } from './query-options';

export const prefetchPublicBlogPostsQuery = (queryClient: QueryClient, slug: string, filter: PublicBlogPostsFilter) =>
	queryClient.prefetchInfiniteQuery(publicBlogPostsQueryOptions({ slug, filter }));
