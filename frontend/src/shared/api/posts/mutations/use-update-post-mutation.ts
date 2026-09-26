'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { updatePost } from '@/shared/api/posts/api';
import { getInvalidPostInputFields } from '@/shared/api/posts/input-validation';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import type { PostWriteRequest } from '@/shared/api/posts/types';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

interface UpdatePostVariables {
	postId: number;
	request: PostWriteRequest;
}

export const useUpdatePostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ postId, request }: UpdatePostVariables) => updatePost(postId, request),
		meta: { errorTracking: 'local' },
		onError: (error, variables) =>
			apiErrorReporter.report(error, {
				operation: 'post.update',
				invalidUserInputFields: getInvalidPostInputFields(variables.request.title),
			}),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
			]),
	});
};
