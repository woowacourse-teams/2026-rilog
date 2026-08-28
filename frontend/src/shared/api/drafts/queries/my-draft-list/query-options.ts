import { infiniteQueryOptions } from '@tanstack/react-query';

import type { DraftListResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { readMyDraftList } from '../../api';
import { draftsQueryKeys } from '../keys';

export const MY_DRAFT_LIST_PAGE_SIZE = 10;

export interface MyDraftListQueryOptions {
	size?: number;
}

export const myDraftListQueryOptions = ({ size = MY_DRAFT_LIST_PAGE_SIZE }: MyDraftListQueryOptions = {}) =>
	infiniteQueryOptions<ApiResponse<DraftListResponse>>({
		queryKey: draftsQueryKeys.myList(size),
		queryFn: ({ pageParam }) => readMyDraftList({ page: Number(pageParam), size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const page = lastPage.data?.page;
			return lastPage.data?.hasNext === true && page !== undefined ? page + 1 : undefined;
		},
		staleTime: 60_000,
		retry: false,
	});
