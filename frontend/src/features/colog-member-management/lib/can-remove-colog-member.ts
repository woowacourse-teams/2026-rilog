import type { CologMember, CologMemberPermission } from '@/domains/blog/model/colog';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

const COLOG_MEMBER_PERMISSION_RANK: Record<CologMemberPermission, number> = {
	MEMBER: 1,
	ADMIN: 2,
	OWNER: 3,
};

export const canRemoveCologMember = (
	currentUserSlug: string | undefined,
	members: readonly CologMember[],
	targetMember: CologMember,
): boolean => {
	if (currentUserSlug === undefined) {
		return false;
	}

	const normalizedCurrentUserSlug = stripAtPrefix(currentUserSlug);
	const currentMember = members.find((member) => stripAtPrefix(member.slug) === normalizedCurrentUserSlug);

	return (
		currentMember !== undefined &&
		COLOG_MEMBER_PERMISSION_RANK[currentMember.permission] > COLOG_MEMBER_PERMISSION_RANK[targetMember.permission]
	);
};
