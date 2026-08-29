'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { useCologMembersQuery } from '@/shared/api/cologs/queries/members/use-query';
import type { BlogMemberResponse } from '@/shared/api/cologs/types';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

export const useCurrentCologPermission = (slug: string): BlogMemberResponse['permission'] | undefined => {
	const { isAuthenticated, isInitialized } = useAuth();
	const isQueryEnabled = isInitialized && isAuthenticated;
	const myInfoQuery = useMyInfoQuery({ isEnabled: isQueryEnabled });
	const membersQuery = useCologMembersQuery({ slug, isEnabled: isQueryEnabled });
	const currentUserId = myInfoQuery.data?.data?.id;

	if (!isQueryEnabled || currentUserId === undefined || membersQuery.data?.data === undefined) {
		return undefined;
	}

	return membersQuery.data.data.find((member) => member.userId === currentUserId)?.permission;
};
