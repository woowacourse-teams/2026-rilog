'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { deletePostCommentAnchor } from '../api';
import { postsQueryKeys } from '../queries/keys';

export const useDeletePostCommentAnchorMutation = (postId: number, commentAnchorId: number) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => deletePostCommentAnchor(postId, commentAnchorId),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: (error) =>
			apiErrorReporter.report(error, {
				operation: 'inline-comment.delete',
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: postsQueryKeys.commentAnchorLists(postId) }),
	});
};
