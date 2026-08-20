'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';
import { subscribeLogoutQueryRemoval } from '@/shared/query/subscribe-logout-query-removal';

export default function AuthenticatedQueryCacheSubscriber() {
	const queryClient = useQueryClient();

	useEffect(
		() =>
			subscribeLogoutQueryRemoval({
				queryClient,
				queryKey: authenticatedQueryKeys.all,
			}),
		[queryClient],
	);

	return null;
}
