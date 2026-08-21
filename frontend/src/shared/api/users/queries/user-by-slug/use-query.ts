'use client';

import { useQuery } from '@tanstack/react-query';

import type { ApiResponse } from '@/shared/api/shared.types';
import type { ReadUserBySlugResponse } from '@/shared/api/users/types';

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
