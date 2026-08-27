'use client';

import { useCallback } from 'react';

import type { LoginEntrySurface } from './login-modal-context';

import { useAuth } from '@/features/auth/model/use-auth';

import { useLoginModal } from './use-login-modal';

interface UseAuthActionOptions {
	action?: () => void;
	entrySurface?: LoginEntrySurface;
}

export const useAuthAction = ({ action, entrySurface }: UseAuthActionOptions = {}) => {
	const { isAuthenticated } = useAuth();
	const login = useLoginModal();

	return useCallback(() => {
		if (!isAuthenticated) {
			login({ entrySurface });
			return;
		}

		action?.();
	}, [action, entrySurface, isAuthenticated, login]);
};
