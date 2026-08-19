import type { QueryClient } from '@tanstack/react-query';

import { publicBlogPostsQueryOptions } from './query-options';

export const prefetchPublicBlogPostsQuery = (queryClient: QueryClient, slug: string, size?: number) =>
	queryClient.prefetchInfiniteQuery(publicBlogPostsQueryOptions({ slug, size }));
