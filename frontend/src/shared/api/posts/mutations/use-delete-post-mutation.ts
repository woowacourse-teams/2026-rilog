'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { deletePost } from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

export const useDeletePostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (postId: number) => deletePost(postId),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.count() }),
			]),
	});
};
