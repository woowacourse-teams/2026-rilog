'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorUpdateRequest } from '../types';

import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { updatePostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useUpdatePostCommentAnchorMutation = (postId: number, commentAnchorId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorUpdateRequest) => updatePostCommentAnchor(postId, commentAnchorId, request),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: async (error) => {
			apiErrorReporter.report(error, {
				operation: 'inline-comment.update',
			});
			if (isInvalidApiResponseError(error)) {
				await queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) });
			}
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
