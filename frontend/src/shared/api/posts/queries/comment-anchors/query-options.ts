import { queryOptions } from '@tanstack/react-query';

import { readPostCommentAnchors } from '../../api';
import { postsQueryKeys } from '../keys';

export const postCommentAnchorsQueryOptions = (postId: number, isAuthenticated = false) =>
	queryOptions({
		queryKey: postsQueryKeys.commentAnchors(postId, isAuthenticated),
		queryFn: () => readPostCommentAnchors(postId),
		staleTime: 60_000,
		retry: false,
	});
