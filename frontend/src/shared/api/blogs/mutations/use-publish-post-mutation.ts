'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { publishPost } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

export const usePublishPostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: publishPost,
		onSuccess: (_, { slug }) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.publicBlogPosts(slug) }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.publicProfile(slug) }),
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.count() }),
			]),
	});
};
