import type {
	BlogMemberResponse,
	CologCreateRequest,
	CologCreateResponse,
	CologMemberInviteRequest,
	CologMemberInviteResponse,
	CologProfileUpdateRequest,
} from './types';

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

export const updateCologProfile = (slug: string, request: CologProfileUpdateRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.patch<ApiResponse<void>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/profiles`, {
		json: request,
	});
};

export const readCologMembers = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<BlogMemberResponse[]>>(`v1/cologs/${encodeURIComponent(normalizedSlug)}/members`);
};
