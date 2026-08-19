import type { MyCologPreviewResponse } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readMyCologsPreview = () =>
	apiClient.get<ApiResponse<MyCologPreviewResponse[]>>('v1/users/me/cologs/preview');
