'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';
import { subscribeTokenRefreshFailureQueryRemoval } from '@/shared/query/subscribe-token-refresh-failure-query-removal';

export default function AuthenticatedQueryCacheSubscriber() {
	const queryClient = useQueryClient();

	useEffect(
		() =>
			subscribeTokenRefreshFailureQueryRemoval({
				queryClient,
				queryKey: authenticatedQueryKeys.all,
			}),
		[queryClient],
	);

	return null;
}
