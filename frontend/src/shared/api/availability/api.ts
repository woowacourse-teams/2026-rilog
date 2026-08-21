import type { CheckNicknameAvailabilityRequest, CheckSlugAvailabilityRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const checkSlugAvailability = ({ slug }: CheckSlugAvailabilityRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<null>>('v1/availability/slug', {
		searchParams: { slug: normalizedSlug },
	});
};

export const checkNicknameAvailability = ({ nickname }: CheckNicknameAvailabilityRequest) =>
	apiClient.get<ApiResponse<null>>('v1/availability/nickname', {
		searchParams: { nickname },
	});
