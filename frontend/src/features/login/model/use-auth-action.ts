'use client';

import { useCallback } from 'react';

import { useLoginModal } from './use-login-modal';

interface UseAuthActionOptions {
	isAuthenticated: boolean;
	action?: () => void;
}

export const useAuthAction = ({ isAuthenticated, action }: UseAuthActionOptions) => {
	const login = useLoginModal();

	return useCallback(() => {
		if (!isAuthenticated) {
			login();
			return;
		}

		action?.();
	}, [action, isAuthenticated, login]);
};
