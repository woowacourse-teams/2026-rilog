import { queryOptions } from '@tanstack/react-query';

import { readPostCommentAnchorsSidebar } from '../../api';
import { postsQueryKeys } from '../keys';

export const postCommentAnchorsSidebarQueryOptions = (postId: number, isAuthenticated = false) =>
	queryOptions({
		queryKey: postsQueryKeys.commentAnchorsSidebar(postId, isAuthenticated),
		queryFn: () => readPostCommentAnchorsSidebar(postId),
		staleTime: 60_000,
		retry: false,
	});
