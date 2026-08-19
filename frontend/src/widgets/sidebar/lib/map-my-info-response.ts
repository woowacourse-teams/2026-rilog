import type { User } from '@/domains/user/model/user';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { MyInfoResponse } from '@/shared/api/users/types';

export const mapMyInfoResponse = (response: ApiResponse<MyInfoResponse>): User | null => {
	const data = response.data;
	if (!data) return null;
	return {
		id: data.id,
		slug: data.slug,
		nickname: data.nickname,
		profileImageUrl: data.profileImageUrl,
	};
};
