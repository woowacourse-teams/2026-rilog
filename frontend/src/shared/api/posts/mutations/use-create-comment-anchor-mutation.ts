'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorCreateRequest } from '../types';

import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { createPostCommentAnchor } from '../api';
import { getInvalidCommentInputFields } from '../comment-input-validation';
import { postsQueryKeys } from '../queries/keys';

export const useCreatePostCommentAnchorMutation = (postId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorCreateRequest) => createPostCommentAnchor(postId, request),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: async (error, request) => {
			apiErrorReporter.report(error, {
				operation: 'inline-comment.create',
				invalidUserInputFields: getInvalidCommentInputFields(request.content),
			});
			if (isInvalidApiResponseError(error)) {
				await queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) });
			}
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
