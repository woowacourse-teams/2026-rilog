'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { leaveColog } from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

export const useLeaveCologMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (slug: string) => leaveColog(slug),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: cologsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsOverview() }),
			]),
	});
};
