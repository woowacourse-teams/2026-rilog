import { apiClient } from '@/shared/api/client';
import type {
	DraftDetailRequest,
	DraftDetailResponse,
	DraftListRequest,
	DraftListResponse,
	DraftPublishRequest,
	DraftPublishResponse,
	DraftSaveRequest,
	DraftSaveResponse,
} from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

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

export const publishDraft = (draftId: number, request: DraftPublishRequest) => {
	const { slug, ...draft } = request;
	const body: DraftPublishRequest = {
		slug: stripAtPrefix(slug),
		...draft,
	};

	return apiClient.patch<ApiResponse<DraftPublishResponse>>(`v1/drafts/${draftId}/publish`, {
		json: body,
	});
};
