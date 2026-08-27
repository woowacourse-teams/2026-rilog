import { apiClient } from '@/shared/api/client';
import type {
	DraftDetailRequest,
	DraftDetailResponse,
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

export const readDraftDetail = ({ draftId }: DraftDetailRequest) =>
	apiClient.get<ApiResponse<DraftDetailResponse>>(`v1/drafts/${draftId}`);

export const overwriteDraft = (draftId: number, request: DraftSaveRequest) =>
	apiClient.put<ApiResponse<DraftSaveResponse>>(`v1/drafts/${draftId}`, { json: request });

export const deleteDraft = (postId: number) => apiClient.delete(`v1/drafts/${postId}`);
