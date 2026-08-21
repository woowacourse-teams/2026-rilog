import { useMutation } from '@tanstack/react-query';

import { tokenManager } from '@/shared/api/auth/token-manager';

import { logoutAuth } from '../api';

export const useLogoutMutation = () => {
	return useMutation({
		mutationFn: () => logoutAuth(),
		onSettled: () => tokenManager.publishLogout(),
	});
};
