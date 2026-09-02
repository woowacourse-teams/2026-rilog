'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { publishPost } from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

export const usePublishPostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: publishPost,
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.count() }),
			]),
	});
};
