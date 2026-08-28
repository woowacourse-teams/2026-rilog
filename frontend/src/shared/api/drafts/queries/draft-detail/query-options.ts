import { queryOptions } from '@tanstack/react-query';

import { readDraftDetail } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import type { DraftDetailResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const draftDetailQueryOptions = (draftId: number) =>
	queryOptions<ApiResponse<DraftDetailResponse>>({
		queryKey: draftsQueryKeys.detail(draftId),
		queryFn: () => readDraftDetail({ draftId }),
		staleTime: 60_000,
		retry: false,
	});
