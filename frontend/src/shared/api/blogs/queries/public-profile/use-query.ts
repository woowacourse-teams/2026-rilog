'use client';

import { useQuery } from '@tanstack/react-query';

import type { CologPublicProfileResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { blogPublicProfileQueryOptions } from './query-options';

interface UseBlogPublicProfileQueryOptions<TData> {
	slug: string;
	isEnabled?: boolean;
	select?: (data: ApiResponse<CologPublicProfileResponse>) => TData;
}

export const useBlogPublicProfileQuery = <TData = ApiResponse<CologPublicProfileResponse>>({
	slug,
	isEnabled = true,
	select,
}: UseBlogPublicProfileQueryOptions<TData>) =>
	useQuery({
		...blogPublicProfileQueryOptions(slug),
		enabled: isEnabled,
		select,
	});
