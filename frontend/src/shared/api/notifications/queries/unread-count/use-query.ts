'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';

import { notificationUnreadCountQueryOptions } from './query-options';

export const useNotificationUnreadCountQuery = () => {
	const { isAuthenticated, isInitialized } = useAuth();

	return useQuery({
		...notificationUnreadCountQueryOptions(),
		enabled: isInitialized && isAuthenticated && tokenManager.getToken() !== null,
	});
};
