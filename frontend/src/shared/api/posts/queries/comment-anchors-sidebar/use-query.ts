'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostCommentAnchorsSidebarResponse } from '../../types';

import type { ApiResponse } from '@/shared/api/shared.types';

import { postCommentAnchorsSidebarQueryOptions } from './query-options';

interface UsePostCommentAnchorsSidebarQueryOptions<TData> {
	postId: number;
	isAuthenticated?: boolean;
	isEnabled?: boolean;
	select?: (response: ApiResponse<PostCommentAnchorsSidebarResponse>) => TData;
}

export const usePostCommentAnchorsSidebarQuery = <TData = ApiResponse<PostCommentAnchorsSidebarResponse>>({
	postId,
	isAuthenticated = false,
	isEnabled = true,
	select,
}: UsePostCommentAnchorsSidebarQueryOptions<TData>) =>
	useQuery({
		...postCommentAnchorsSidebarQueryOptions(postId, isAuthenticated),
		enabled: isEnabled,
		select,
	});
