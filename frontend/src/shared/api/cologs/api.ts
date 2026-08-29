import type {
	BlogMemberResponse,
	CologCreateRequest,
	CologCreateResponse,
	CologMemberInviteRequest,
	CologMemberInviteResponse,
} from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const createColog = (request: CologCreateRequest) =>
	apiClient.post<ApiResponse<CologCreateResponse>>('v1/cologs', { json: request });

export const deleteColog = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.delete(`v1/cologs/${encodeURIComponent(normalizedSlug)}`);
};

export const inviteCologMember = (slug: string, request: CologMemberInviteRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.post<ApiResponse<CologMemberInviteResponse>>(
		`v1/cologs/${encodeURIComponent(normalizedSlug)}/members`,
		{ json: request },
	);
};

export const readCologMembers = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<BlogMemberResponse[]>>(`v1/cologs/${encodeURIComponent(normalizedSlug)}/members`);
};

export const removeCologMember = (slug: string, memberId: number) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.delete(`v1/cologs/${encodeURIComponent(normalizedSlug)}/members/${memberId}`);
};
