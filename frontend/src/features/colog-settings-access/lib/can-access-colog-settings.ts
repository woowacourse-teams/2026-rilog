import type { BlogMemberResponse } from '@/shared/api/cologs/types';

const SETTINGS_PERMISSIONS = new Set<BlogMemberResponse['permission']>(['OWNER', 'ADMIN']);

export const canAccessCologSettings = (currentUserId: number, members: readonly BlogMemberResponse[]) => {
	const currentMember = members.find((member) => member.userId === currentUserId);

	return currentMember !== undefined && SETTINGS_PERMISSIONS.has(currentMember.permission);
};
