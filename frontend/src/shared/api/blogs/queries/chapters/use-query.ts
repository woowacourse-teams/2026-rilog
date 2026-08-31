'use client';

import { useQuery } from '@tanstack/react-query';

import type { ChapterResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { blogChaptersQueryOptions } from './query-options';

interface UseBlogChaptersQueryOptions<TData> {
	slug: string;
	isEnabled?: boolean;
	select?: (data: ApiResponse<ChapterResponse[]>) => TData;
}

export const useBlogChaptersQuery = <TData = ApiResponse<ChapterResponse[]>>({
	slug,
	isEnabled = true,
	select,
}: UseBlogChaptersQueryOptions<TData>) =>
	useQuery({
		...blogChaptersQueryOptions(slug),
		enabled: isEnabled,
		select,
	});
