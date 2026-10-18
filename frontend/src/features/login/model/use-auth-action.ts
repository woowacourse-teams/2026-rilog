'use client';

import { useCallback } from 'react';

import type { LoginEntrySurface } from './login-modal-context';

import { useAuth } from '@/features/auth/model/use-auth';

import { clearPendingAuthAction } from '../lib/pending-auth-action';

import { useLoginModal } from './use-login-modal';

interface UseAuthActionOptions<TArgs extends unknown[]> {
	action?: (...args: TArgs) => void;
	beforeAuth?: (...args: TArgs) => void;
	entrySurface?: LoginEntrySurface;
}

export const useAuthAction = <TArgs extends unknown[] = []>({
	action,
	beforeAuth,
	entrySurface,
}: UseAuthActionOptions<TArgs> = {}) => {
	const { isAuthenticated } = useAuth();
	const login = useLoginModal();

	return useCallback(
		(...args: TArgs) => {
			if (!isAuthenticated) {
				clearPendingAuthAction();
				beforeAuth?.(...args);
				login({ entrySurface });
				return;
			}

			action?.(...args);
		},
		[action, beforeAuth, entrySurface, isAuthenticated, login],
	);
};
