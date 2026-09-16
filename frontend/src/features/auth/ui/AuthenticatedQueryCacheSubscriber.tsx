'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export default function AuthenticatedQueryCacheSubscriber() {
	const queryClient = useQueryClient();

	useEffect(() => {
		const unsubscribeLogin = tokenManager.subscribeLogin(() => {
			// 내 정보 응답 지연이 로그인 완료·페이지 이동을 막지 않도록 재조회는 기다리지 않는다.
			void queryClient.resetQueries({ queryKey: authenticatedQueryKeys.all });
		});
		const clearAuthenticatedQueries = () => queryClient.removeQueries({ queryKey: authenticatedQueryKeys.all });
		const unsubscribeOnboarding = tokenManager.subscribeOnboarding(clearAuthenticatedQueries);
		const unsubscribeLogout = tokenManager.subscribeLogout(clearAuthenticatedQueries);
		return () => {
			unsubscribeLogin();
			unsubscribeOnboarding();
			unsubscribeLogout();
		};
	}, [queryClient]);

	return null;
}
