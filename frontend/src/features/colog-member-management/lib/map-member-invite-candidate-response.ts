import type { MemberInviteCandidate } from '../model/member-invite-candidate';

import type { ApiResponse } from '@/shared/api/shared.types';
import type { ReadUserBySlugResponse } from '@/shared/api/users/types';

export const mapMemberInviteCandidateResponse = (
	response: ApiResponse<ReadUserBySlugResponse>,
): MemberInviteCandidate | undefined => {
	if (response.data === undefined) return undefined;

	const user = response.data;
	return {
		userId: user.id,
		slug: user.slug,
		nickname: user.nickname,
		profileImageUrl: user.profileImageUrl,
	};
};
