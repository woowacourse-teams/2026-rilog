'use client';

import { useQuery } from '@tanstack/react-query';

import type { User } from '@/domains/user/model/user';
import type { ApiResponse } from '@/shared/api/shared.types';

import { myInfoQueryOptions } from './query-options';

interface UseMyInfoQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<User>) => TData;
}

export const useMyInfoQuery = <TData = ApiResponse<User>>({
	isEnabled = true,
	select,
}: UseMyInfoQueryOptions<TData> = {}) =>
	useQuery({
		...myInfoQueryOptions(),
		enabled: isEnabled,
		select,
	});
