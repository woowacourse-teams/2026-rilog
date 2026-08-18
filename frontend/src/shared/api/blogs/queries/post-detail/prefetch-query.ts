import type { QueryClient } from '@tanstack/react-query';

import { blogPostDetailQueryOptions } from './query-options';

export const prefetchBlogPostDetailQuery = (queryClient: QueryClient, slug: string, postId: number) =>
	queryClient.prefetchQuery(blogPostDetailQueryOptions(slug, postId));
