import type { User } from '@/domains/user/model/user';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyInfoResponse } from '@/shared/api/users/types';

export const mapCurrentMemberUserResponse = (response: ApiResponse<MyInfoResponse>): User | undefined => {
	if (response.data === undefined) return undefined;

	const user = response.data;
	return {
		id: user.id,
		slug: user.slug,
		nickname: user.nickname,
		profileImageUrl: user.profileImageUrl,
	};
};
