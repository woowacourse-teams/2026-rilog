'use client';

import { useQuery } from '@tanstack/react-query';

import type { User } from '@/domains/user/model/user';
import { useAuth } from '@/features/auth/model/use-auth';
import type { ApiResponse } from '@/shared/api/shared.types';

import { myInfoQueryOptions } from './query-options';

interface UseMyInfoQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<User>) => TData;
}

export const useMyInfoQuery = <TData = ApiResponse<User>>({
	isEnabled = true,
	select,
}: UseMyInfoQueryOptions<TData> = {}) => {
	const { isAuthenticated } = useAuth();

	return useQuery({
		...myInfoQueryOptions(),
		enabled: isEnabled && isAuthenticated,
		select,
	});
};
