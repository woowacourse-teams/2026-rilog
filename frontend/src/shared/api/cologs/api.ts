import type { CologCreateRequest, CologCreateResponse, CologMemberInviteRequest, CologMemberInviteResponse } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const createColog = (request: CologCreateRequest) =>
	apiClient.post<ApiResponse<CologCreateResponse>>('v1/cologs', { json: request });

export const inviteCologMember = (slug: string, request: CologMemberInviteRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.post<ApiResponse<CologMemberInviteResponse>>(
		`v1/cologs/${encodeURIComponent(normalizedSlug)}/members`,
		{ json: request },
	);
};
