'use client';

import { useQuery } from '@tanstack/react-query';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { cologMembersQueryOptions } from './query-options';

interface UseCologMembersQueryOptions<TData> {
	slug: string;
	isEnabled?: boolean;
	select?: (data: ApiResponse<BlogMemberResponse[]>) => TData;
}

export const useCologMembersQuery = <TData = ApiResponse<BlogMemberResponse[]>>({
	slug,
	isEnabled = true,
	select,
}: UseCologMembersQueryOptions<TData>) =>
	useQuery({
		...cologMembersQueryOptions(slug),
		enabled: isEnabled,
		select,
	});
