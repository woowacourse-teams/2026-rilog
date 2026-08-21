'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export default function AuthenticatedQueryCacheSubscriber() {
	const queryClient = useQueryClient();

	useEffect(
		() =>
			tokenManager.subscribeLogout(() => {
				queryClient.removeQueries({ queryKey: authenticatedQueryKeys.all });
			}),
		[queryClient],
	);

	return null;
}
