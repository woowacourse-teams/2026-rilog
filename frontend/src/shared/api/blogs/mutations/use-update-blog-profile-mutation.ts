'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateBlogProfile } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import type { BlogProfileUpdateRequest } from '@/shared/api/blogs/types';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

interface UpdateBlogProfileVariables {
	slug: string;
	request: BlogProfileUpdateRequest;
}

export const useUpdateBlogProfileMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, request }: UpdateBlogProfileVariables) => updateBlogProfile(slug, request),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myInfo() }),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsPreview() }),
			]),
	});
};
