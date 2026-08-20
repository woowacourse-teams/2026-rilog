import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

import { logoutAuth } from '../api';

export const useLogoutMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => logoutAuth(),
		onSettled: () => {
			queryClient.removeQueries({ queryKey: authenticatedQueryKeys.all });
		},
	});
};
