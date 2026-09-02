'use client';

import { useQuery } from '@tanstack/react-query';

import type { BlogIndexResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { blogIndexQueryOptions } from './query-options';

interface UseBlogIndexQueryOptions<TData> {
	slug: string;
	isEnabled?: boolean;
	select?: (data: ApiResponse<BlogIndexResponse>) => TData;
}

export const useBlogIndexQuery = <TData = ApiResponse<BlogIndexResponse>>({
	slug,
	isEnabled = true,
	select,
}: UseBlogIndexQueryOptions<TData>) =>
	useQuery({
		...blogIndexQueryOptions(slug),
		enabled: isEnabled,
		select,
	});
