'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { useCologMembersQuery } from '@/shared/api/cologs/queries/members/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

import { canAccessCologSettings } from '../lib/can-access-colog-settings';
import { canAccessRilogSettings } from '../lib/can-access-rilog-settings';

export type SettingsAccessStatus =
	'initializing' | 'checking' | 'authorized' | 'unauthenticated' | 'forbidden' | 'error';

interface UseSettingsAccessOptions {
	type: 'COLOG' | 'RILOG';
	slug: string;
}

export const useSettingsAccess = ({ type, slug }: UseSettingsAccessOptions): SettingsAccessStatus => {
	const { isAuthenticated, isInitialized } = useAuth();
	const isAuthenticatedUserReady = isInitialized && isAuthenticated;
	const myInfoQuery = useMyInfoQuery({ isEnabled: isAuthenticatedUserReady });
	const membersQuery = useCologMembersQuery({
		slug,
		isEnabled: isAuthenticatedUserReady && type === 'COLOG',
	});

	if (!isInitialized) {
		return 'initializing';
	}

	if (!isAuthenticated) {
		return 'unauthenticated';
	}

	if (myInfoQuery.isPending || (type === 'COLOG' && membersQuery.isPending)) {
		return 'checking';
	}

	if (myInfoQuery.isError || myInfoQuery.data?.data === undefined) {
		return 'error';
	}

	if (type === 'RILOG') {
		return canAccessRilogSettings(myInfoQuery.data.data.slug, slug) ? 'authorized' : 'forbidden';
	}

	if (membersQuery.isError || membersQuery.data?.data === undefined) {
		return 'error';
	}

	return canAccessCologSettings(myInfoQuery.data.data.id, membersQuery.data.data) ? 'authorized' : 'forbidden';
};
