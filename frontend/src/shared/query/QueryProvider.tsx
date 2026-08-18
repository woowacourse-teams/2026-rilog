'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { ReactNode } from 'react';

import type { NormalizedApiError } from '@/shared/api/api-error';

interface QueryProviderProps {
	children: ReactNode;
}

const isRetryableError = (error: unknown): boolean => {
	const apiError = error as NormalizedApiError;

	if (apiError.kind === 'network' || apiError.kind === 'timeout') {
		return true;
	}

	if (apiError.kind === 'http' || apiError.kind === 'api') {
		return apiError.response.status >= 500 && apiError.response.status < 600;
	}

	return false;
};

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
					onError: (error) => {
						const apiError = error as unknown as NormalizedApiError;
						// REQUEST_VALIDATION_FAILED (필드 오류)는 지역(form) mutation onError에 위임합니다.
						if (apiError.kind === 'api' && apiError.category === 'field') {
							return;
						}

						// TODO: 공통 오류 처리기로 전달 (토스트/라우팅)
						console.error('공통 오류 처리기 (Mutation):', apiError);
					},
				}),
			}),
	);

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
