'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PostCommentAnchorUpdateRequest } from '../types';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { updatePostCommentAnchor } from '../api';
import { getInvalidCommentInputFields } from '../comment-input-validation';
import { postsQueryKeys } from '../queries/keys';

export const useUpdatePostCommentAnchorMutation = (postId: number, commentAnchorId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (request: PostCommentAnchorUpdateRequest) => updatePostCommentAnchor(postId, commentAnchorId, request),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: (error, request) =>
			apiErrorReporter.report(error, {
				operation: 'inline-comment.update',
				invalidUserInputFields: getInvalidCommentInputFields(request.content),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
