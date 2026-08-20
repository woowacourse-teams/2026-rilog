import type { MyCologPreviewResponse, MyInfoResponse, ReadUserBySlugRequest, ReadUserBySlugResponse } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const readUserBySlug = ({ slug }: ReadUserBySlugRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<ReadUserBySlugResponse>>(`v1/users/${encodeURIComponent(normalizedSlug)}`);
};

export const readMyCologsPreview = () =>
	apiClient.get<ApiResponse<MyCologPreviewResponse[]>>('v1/users/me/cologs/preview');

export const readMyInfo = () => apiClient.get<ApiResponse<MyInfoResponse>>('v1/users/me');

