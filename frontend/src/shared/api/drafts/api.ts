import { apiClient } from '@/shared/api/client';
import type { DraftSaveRequest, DraftSaveResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const saveDraft = (request: DraftSaveRequest) =>
	apiClient.post<ApiResponse<DraftSaveResponse>>('v1/drafts', { json: request });
