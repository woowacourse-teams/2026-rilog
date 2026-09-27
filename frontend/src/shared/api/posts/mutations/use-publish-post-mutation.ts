'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { publishPost } from '@/shared/api/posts/api';
import { getInvalidPostInputFields } from '@/shared/api/posts/input-validation';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

export const usePublishPostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: publishPost,
		meta: { errorTracking: 'local' },
		onError: (error, variables) =>
			apiErrorReporter.report(error, {
				operation: 'post.publish',
				invalidUserInputFields: getInvalidPostInputFields(variables.title),
			}),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.count() }),
			]),
	});
};
