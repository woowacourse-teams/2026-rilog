'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deletePostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useDeletePostCommentAnchorMutation = (postId: number, commentAnchorId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => deletePostCommentAnchor(postId, commentAnchorId),
		retry: false,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
