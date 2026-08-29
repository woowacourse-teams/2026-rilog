'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { deleteColog } from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

export const useDeleteCologMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (slug: string) => deleteColog(slug),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: cologsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsPreview() }),
			]),
	});
};
