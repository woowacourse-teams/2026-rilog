'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { useCologMembersQuery } from '@/shared/api/cologs/queries/members/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

import { canAccessCologSettings } from '../lib/can-access-colog-settings';

export type CologSettingsAccessStatus = 'initializing' | 'checking' | 'authorized' | 'unauthorized' | 'error';

export const useCologSettingsAccess = (slug: string): CologSettingsAccessStatus => {
	const { isAuthenticated, isInitialized } = useAuth();
	const myInfoQuery = useMyInfoQuery({ isEnabled: isInitialized });
	const membersQuery = useCologMembersQuery({ slug, isEnabled: isInitialized && isAuthenticated });

	if (!isInitialized) {
		return 'initializing';
	}

	if (!isAuthenticated) {
		return 'unauthorized';
	}

	if (myInfoQuery.isPending || membersQuery.isPending) {
		return 'checking';
	}

	if (myInfoQuery.isError || membersQuery.isError) {
		return 'error';
	}

	const currentUser = myInfoQuery.data.data;
	const members = membersQuery.data.data;

	if (currentUser === undefined || members === undefined) {
		return 'error';
	}

	return canAccessCologSettings(currentUser.id, members) ? 'authorized' : 'unauthorized';
};
