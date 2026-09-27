'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorAddRequest } from '../types';

import { addPostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useAddPostCommentAnchorMutation = (postId: number, selectionId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorAddRequest) => addPostCommentAnchor(postId, selectionId, request),
		retry: false,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
