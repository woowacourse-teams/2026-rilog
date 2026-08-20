'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { publishPost } from '@/shared/api/blogs/api';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';

export const usePublishPostMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: publishPost,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
	});
};
