'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorAddRequest } from '../types';

import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { addPostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useAddPostCommentAnchorMutation = (postId: number, selectionId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorAddRequest) => addPostCommentAnchor(postId, selectionId, request),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: async (error) => {
			apiErrorReporter.report(error, {
				operation: 'inline-comment.add',
			});
			if (isInvalidApiResponseError(error)) {
				await queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) });
			}
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
