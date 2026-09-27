'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorUpdateRequest } from '../types';

import { updatePostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useUpdatePostCommentAnchorMutation = (postId: number, commentAnchorId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorUpdateRequest) => updatePostCommentAnchor(postId, commentAnchorId, request),
		retry: false,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
