import type { ReadUserBySlugRequest, ReadUserBySlugResponse } from '@/api/users/types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const readUserBySlug = ({ slug }: ReadUserBySlugRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<ReadUserBySlugResponse>>(`v1/users/${encodeURIComponent(normalizedSlug)}`);
};
