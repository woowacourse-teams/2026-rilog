'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { updateCologProfile } from '@/shared/api/cologs/api';
import type { CologProfileUpdateRequest } from '@/shared/api/cologs/types';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

interface UpdateCologProfileVariables {
	slug: string;
	request: CologProfileUpdateRequest;
}

export const useUpdateCologProfileMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, request }: UpdateCologProfileVariables) => updateCologProfile(slug, request),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsPreview() }),
			]),
	});
};
