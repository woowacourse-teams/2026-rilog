import type { CologMember } from '@/domains/blog/model/colog';
import type { BlogMemberResponse } from '@/shared/api/cologs/types';

export const mapCologMemberResponse = (response: BlogMemberResponse): CologMember => {
	return {
		id: response.id,
		nickname: response.nickname,
		slug: response.slug,
		profileImageUrl: response.profileImageUrl,
		permission: response.permission,
		blogRole: response.blogRole,
		joinedAt: response.joinedAt,
	};
};
