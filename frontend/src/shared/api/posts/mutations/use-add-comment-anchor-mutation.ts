'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorAddRequest } from '../types';

import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { addPostCommentAnchor } from '../api';
import { getInvalidCommentInputFields } from '../comment-input-validation';
import { postsQueryKeys } from '../queries/keys';

export const useAddPostCommentAnchorMutation = (postId: number, selectionId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorAddRequest) => addPostCommentAnchor(postId, selectionId, request),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: async (error, request) => {
			apiErrorReporter.report(error, {
				operation: 'inline-comment.add',
				invalidUserInputFields: getInvalidCommentInputFields(request.content),
			});
			if (isInvalidApiResponseError(error)) {
				await queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) });
			}
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
