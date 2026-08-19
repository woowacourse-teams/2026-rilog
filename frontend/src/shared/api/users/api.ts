import type { MyCologPreviewResponse, MyInfoResponse } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readMyCologsPreview = () =>
	apiClient.get<ApiResponse<MyCologPreviewResponse[]>>('v1/users/me/cologs/preview');

export const readMyInfo = () => apiClient.get<ApiResponse<MyInfoResponse>>('v1/users/me');
