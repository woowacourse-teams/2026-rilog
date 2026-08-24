'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { postDetailQueryOptions } from './query-options';

interface UsePostDetailQueryOptions<TData> {
	postId: number;
	isEnabled?: boolean;
	select?: (data: ApiResponse<PostDetailResponse>) => TData;
}

export const usePostDetailQuery = <TData = ApiResponse<PostDetailResponse>>({
	postId,
	isEnabled = true,
	select,
}: UsePostDetailQueryOptions<TData>) =>
	useQuery({
		...postDetailQueryOptions(postId),
		enabled: isEnabled,
		select,
	});
