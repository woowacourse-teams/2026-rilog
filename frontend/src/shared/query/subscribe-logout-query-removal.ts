import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { tokenManager } from '@/shared/api/auth/token-manager';

interface SubscribeLogoutQueryRemovalOptions {
	exact?: boolean;
	queryClient: QueryClient;
	queryKey: QueryKey;
}

export const subscribeLogoutQueryRemoval = ({ exact, queryClient, queryKey }: SubscribeLogoutQueryRemovalOptions) =>
	tokenManager.subscribeLogout(() => {
		queryClient.removeQueries({ exact, queryKey });
	});
