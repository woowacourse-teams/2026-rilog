import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';
import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
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
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

const isId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isDraftSaveResponse = (value: unknown): value is DraftSaveResponse => isRecord(value) && isId(value.draftId);
const isDraftPublishResponse = (value: unknown): value is DraftPublishResponse =>
	isRecord(value) && isId(value.postId) && typeof value.slug === 'string' && value.slug.length > 0;
const isDraftDetailResponse = (value: unknown): value is DraftDetailResponse =>
	isRecord(value) &&
	isId(value.draftId) &&
	typeof value.title === 'string' &&
	isBlockNoteDocument(value.content) &&
	(value.status === 'PUBLISHED' || value.status === 'DRAFT') &&
	typeof value.publishedAt === 'string';

export const saveDraft = (request: DraftSaveRequest): Promise<ApiResponse<DraftSaveResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.post('v1/drafts', { json: request });
		return parseApiJsonResponse(response, 'save draft', isDraftSaveResponse);
	});

export const readMyDraftList = ({ page, size }: DraftListRequest) =>
	apiClient.get<ApiResponse<DraftListResponse>>('v1/drafts/me', {
		searchParams: { page, size },
	});

export const readDraftDetail = ({ draftId }: DraftDetailRequest): Promise<ApiResponse<DraftDetailResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.get(`v1/drafts/${draftId}`);
		return parseApiJsonResponse(response, 'read draft detail', isDraftDetailResponse);
	});

export const overwriteDraft = (draftId: number, request: DraftSaveRequest): Promise<ApiResponse<DraftSaveResponse>> =>
	apiRequest(async () => {
		const response = await kyInstance.put(`v1/drafts/${draftId}`, { json: request });
		return parseApiJsonResponse(response, 'overwrite draft', isDraftSaveResponse);
	});

export const deleteDraft = (postId: number) => apiClient.delete(`v1/drafts/${postId}`);

export const publishDraft = (
	draftId: number,
	request: DraftPublishRequest,
): Promise<ApiResponse<DraftPublishResponse>> => {
	const { slug, ...draft } = request;
	const body: DraftPublishRequest = {
		slug: stripAtPrefix(slug),
		...draft,
	};

	return apiRequest(async () => {
		const response = await kyInstance.put(`v1/drafts/${draftId}/publish`, { json: body });
		return parseApiJsonResponse(response, 'publish draft', isDraftPublishResponse);
	});
};
