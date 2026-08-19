'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/model/use-auth';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyInfoResponse } from '@/shared/api/users/types';

import { myInfoQueryOptions } from './query-options';

interface UseMyInfoQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<MyInfoResponse>) => TData;
}

export const useMyInfoQuery = <TData = ApiResponse<MyInfoResponse>>({
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
