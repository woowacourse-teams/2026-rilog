'use client';

import { useQuery } from '@tanstack/react-query';

import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyCologPreviewResponse } from '@/shared/api/users/types';

import { myCologsPreviewQueryOptions } from './query-options';

interface UseMyCologsPreviewQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<MyCologPreviewResponse[]>) => TData;
}

export const useMyCologsPreviewQuery = <TData = ApiResponse<MyCologPreviewResponse[]>>({
	isEnabled = true,
	select,
}: UseMyCologsPreviewQueryOptions<TData> = {}) =>
	useQuery({
		...myCologsPreviewQueryOptions(),
		enabled: isEnabled,
		select,
	});
