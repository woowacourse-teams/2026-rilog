'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { postDetailQueryOptions } from './query-options';

interface UsePostDetailQueryOptions<TData> {
	slug: string;
	postId: number;
	isEnabled?: boolean;
	select?: (data: ApiResponse<PostDetailResponse>) => TData;
}

export const usePostDetailQuery = <TData = ApiResponse<PostDetailResponse>>({
	slug,
	postId,
	isEnabled = true,
	select,
}: UsePostDetailQueryOptions<TData>) =>
	useQuery({
		...postDetailQueryOptions(slug, postId),
		enabled: isEnabled,
		select,
	});
