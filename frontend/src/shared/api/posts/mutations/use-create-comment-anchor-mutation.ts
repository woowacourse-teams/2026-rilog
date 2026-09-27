'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorCreateRequest } from '../types';

import { createPostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useCreatePostCommentAnchorMutation = (postId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorCreateRequest) => createPostCommentAnchor(postId, request),
		retry: false,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
