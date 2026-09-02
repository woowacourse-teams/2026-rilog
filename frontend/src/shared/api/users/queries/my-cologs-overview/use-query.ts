'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/model/use-auth';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyCologOverviewResponse } from '@/shared/api/users/types';

import { myCologsOverviewQueryOptions } from './query-options';

interface UseMyCologsOverviewQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<MyCologOverviewResponse[]>) => TData;
}

export const useMyCologsOverviewQuery = <TData = ApiResponse<MyCologOverviewResponse[]>>({
	isEnabled = true,
	select,
}: UseMyCologsOverviewQueryOptions<TData> = {}) => {
	const { isAuthenticated } = useAuth();

	return useQuery({
		...myCologsOverviewQueryOptions(),
		enabled: isEnabled && isAuthenticated,
		select,
	});
};
