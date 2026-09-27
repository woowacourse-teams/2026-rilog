import type { QueryClient } from '@tanstack/react-query';

import { postCommentAnchorsSidebarQueryOptions } from './query-options';

export const prefetchPostCommentAnchorsSidebarQuery = (
	queryClient: QueryClient,
	postId: number,
	isAuthenticated = false,
) => queryClient.prefetchQuery(postCommentAnchorsSidebarQueryOptions(postId, isAuthenticated));
