import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { subscribeTokenRefreshFailure } from '../api/api-client';

type SubscribeTokenRefreshFailureQueryRemovalOptions = {
	exact?: boolean;
	queryClient: QueryClient;
	queryKey: QueryKey;
};

export const subscribeTokenRefreshFailureQueryRemoval = ({
	exact,
	queryClient,
	queryKey,
}: SubscribeTokenRefreshFailureQueryRemovalOptions) =>
	subscribeTokenRefreshFailure(() => {
		queryClient.removeQueries({ exact, queryKey });
	});
