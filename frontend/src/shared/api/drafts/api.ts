import { apiClient } from '@/shared/api/client';
import type {
	DraftListRequest,
	DraftListResponse,
	DraftSaveRequest,
	DraftSaveResponse,
} from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const saveDraft = (request: DraftSaveRequest) =>
	apiClient.post<ApiResponse<DraftSaveResponse>>('v1/drafts', { json: request });

export const readMyDraftList = ({ page, size }: DraftListRequest) =>
	apiClient.get<ApiResponse<DraftListResponse>>('v1/drafts/me', {
		searchParams: { page, size },
	});
