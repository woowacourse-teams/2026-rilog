import type { TheRilogResponse } from './types';

import { apiRequest, kyInstance } from '@/shared/api/client';
import { parseApiJsonResponse } from '@/shared/api/response-validation';
import type { ApiResponse } from '@/shared/api/shared.types';

import { isTheRilogResponse } from './response-guards';

export const readTheRilog = (): Promise<ApiResponse<TheRilogResponse> & { data: TheRilogResponse }> =>
	apiRequest(async () => {
		const response = await kyInstance.get('v1/the-rilog', { cache: 'no-store' });
		return parseApiJsonResponse(response, 'read the rilog', isTheRilogResponse);
	});
