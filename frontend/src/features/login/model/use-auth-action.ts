'use client';

import { useCallback } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';

import { useLoginModal } from './use-login-modal';

interface UseAuthActionOptions {
	action?: () => void;
}

export const useAuthAction = ({ action }: UseAuthActionOptions = {}) => {
	const { isAuthenticated } = useAuth();
	const login = useLoginModal();

	return useCallback(() => {
		if (!isAuthenticated) {
			login();
			return;
		}

		action?.();
	}, [action, isAuthenticated, login]);
};
