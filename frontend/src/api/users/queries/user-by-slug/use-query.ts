'use client';

import { useQuery } from '@tanstack/react-query';

import type { ReadUserBySlugResponse } from '@/api/users/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { userBySlugQueryOptions } from './query-options';

interface UseUserBySlugQueryOptions<TData> {
	slug: string;
	isEnabled?: boolean;
	select?: (data: ApiResponse<ReadUserBySlugResponse>) => TData;
}

export const useUserBySlugQuery = <TData = ApiResponse<ReadUserBySlugResponse>>({
	slug,
	isEnabled = true,
	select,
}: UseUserBySlugQueryOptions<TData>) =>
	useQuery({
		...userBySlugQueryOptions(slug),
		enabled: isEnabled,
		select,
	});
