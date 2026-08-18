'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostDetailResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { blogPostDetailQueryOptions } from './query-options';

interface UseBlogPostDetailQueryOptions<TData> {
	slug: string;
	postId: number;
	isEnabled?: boolean;
	select?: (data: ApiResponse<PostDetailResponse>) => TData;
}

export const useBlogPostDetailQuery = <TData = ApiResponse<PostDetailResponse>>({
	slug,
	postId,
	isEnabled = true,
	select,
}: UseBlogPostDetailQueryOptions<TData>) =>
	useQuery({
		...blogPostDetailQueryOptions(slug, postId),
		enabled: isEnabled,
		select,
	});
