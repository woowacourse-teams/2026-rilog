'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteData } from '@tanstack/react-query';

import type { DraftListResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { myDraftListQueryOptions } from './query-options';

interface UseMyDraftListQueryOptions<TData> {
	size?: number;
	isEnabled?: boolean;
	select?: (data: InfiniteData<ApiResponse<DraftListResponse>, unknown>) => TData;
}

export const useMyDraftListQuery = <TData = InfiniteData<ApiResponse<DraftListResponse>, unknown>>({
	size,
	isEnabled = true,
	select,
}: UseMyDraftListQueryOptions<TData> = {}) =>
	useInfiniteQuery({
		...myDraftListQueryOptions({ size }),
		enabled: isEnabled,
		select,
	});
