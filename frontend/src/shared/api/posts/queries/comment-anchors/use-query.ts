'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostCommentAnchorsResponse } from '../../types';

import type { ApiResponse } from '@/shared/api/shared.types';

import { postCommentAnchorsQueryOptions } from './query-options';

interface UsePostCommentAnchorsQueryOptions<TData> {
	postId: number;
	isAuthenticated?: boolean;
	isEnabled?: boolean;
	select?: (response: ApiResponse<PostCommentAnchorsResponse>) => TData;
}

export const usePostCommentAnchorsQuery = <TData = ApiResponse<PostCommentAnchorsResponse>>({
	postId,
	isAuthenticated = false,
	isEnabled = true,
	select,
}: UsePostCommentAnchorsQueryOptions<TData>) =>
	useQuery({
		...postCommentAnchorsQueryOptions(postId, isAuthenticated),
		enabled: isEnabled,
		select,
	});
