import type { CologCreateRequest, CologCreateResponse } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const createColog = (request: CologCreateRequest) =>
	apiClient.post<ApiResponse<CologCreateResponse>>('v1/cologs', { json: request });
