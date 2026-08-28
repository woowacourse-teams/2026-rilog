'use client';

import { useQuery } from '@tanstack/react-query';

import type { DraftDetailResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { draftDetailQueryOptions } from './query-options';

interface UseDraftDetailQueryOptions<TData> {
	draftId: number;
	isEnabled?: boolean;
	select?: (data: ApiResponse<DraftDetailResponse>) => TData;
}

export const useDraftDetailQuery = <TData = ApiResponse<DraftDetailResponse>>({
	draftId,
	isEnabled = true,
	select,
}: UseDraftDetailQueryOptions<TData>) =>
	useQuery({
		...draftDetailQueryOptions(draftId),
		enabled: isEnabled,
		select,
	});
