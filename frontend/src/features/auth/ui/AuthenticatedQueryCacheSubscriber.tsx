'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';
import {
	isPostDetailQueryKey,
	isPreviousSessionPostDetailQueryKey,
	postsQueryKeys,
} from '@/shared/api/posts/queries/keys';
import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export default function AuthenticatedQueryCacheSubscriber() {
	const queryClient = useQueryClient();

	useEffect(() => {
		const clearPreviousDetails = () => {
			const sessionVersion = tokenManager.getSessionVersion();
			const filters = {
				queryKey: postsQueryKeys.details(),
				predicate: (query: { queryKey: readonly unknown[] }) =>
					isPreviousSessionPostDetailQueryKey(query.queryKey, sessionVersion),
			};
			// 취소와 제거를 같은 전이 안에서 끝내 새 세대 캐시를 뒤늦게 지우지 않는다.
			void queryClient.cancelQueries(filters);
			queryClient.removeQueries(filters);
		};
		const unsubscribeLogin = tokenManager.subscribeLogin(() => {
			clearPreviousDetails();
			// 내 정보 응답 지연이 로그인 완료·페이지 이동을 막지 않도록 재조회는 기다리지 않는다.
			void queryClient.resetQueries({
				queryKey: authenticatedQueryKeys.all,
				predicate: (query) => !isPostDetailQueryKey(query.queryKey),
			});
		});
		const clearAuthenticatedQueries = () => {
			clearPreviousDetails();
			queryClient.removeQueries({
				queryKey: authenticatedQueryKeys.all,
				predicate: (query) => !isPostDetailQueryKey(query.queryKey),
			});
		};
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
