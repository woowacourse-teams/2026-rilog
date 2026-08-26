'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { updatePost } from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import type { PostWriteRequest } from '@/shared/api/posts/types';

interface UpdatePostVariables {
	postId: number;
	request: PostWriteRequest;
}

export const useUpdatePostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ postId, request }: UpdatePostVariables) => updatePost(postId, request),
		onSuccess: (_, { postId }) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.detail(postId) }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
			]),
	});
};
