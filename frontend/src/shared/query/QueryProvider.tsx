'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { ReactNode } from 'react';

import { globalMutationErrorHandler, isRetryableError } from './query-client-config';

interface QueryProviderProps {
	children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: (failureCount, error) => {
							// 기본적으로 재시도하지 않으나, 네트워크/5xx 오류인 경우 2회까지 재시도합니다.
							if (failureCount >= 2) return false;
							return isRetryableError(error);
						},
					},
					mutations: {
						retry: false, // mutation 자동 재시도는 하지 않습니다.
					},
				},
				mutationCache: new MutationCache({
					onError: (error) => globalMutationErrorHandler(error),
				}),
			}),
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
