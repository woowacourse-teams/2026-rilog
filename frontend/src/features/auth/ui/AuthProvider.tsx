'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { tokenProvider } from '@/features/auth/model/token-provider';
import { subscribeTokenRefreshFailure } from '@/shared/api/client';

import { AUTH_CONTEXT } from '../model/auth-context';

interface AuthProviderProps {
	children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isInitialized, setIsInitialized] = useState(false);

	const logout = useCallback(() => {
		tokenProvider.clearAccessToken();
		setIsAuthenticated(false);
	}, []);

	useEffect(() => {
		// 클라이언트 렌더링 시점에 tokenProvider를 통해 토큰 여부를 확인하고 상태를 갱신합니다.
		const token = tokenProvider.getAccessToken();
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsAuthenticated(token !== null);
		setIsInitialized(true);

		// 토큰 만료 시(Refresh 실패 시) 자동 로그아웃 처리
		const unsubscribe = subscribeTokenRefreshFailure(() => {
			logout();
		});

		return unsubscribe;
	}, [logout]);

	// 초기화되기 전에는 아무것도 렌더링하지 않거나(깜빡임 방지), 혹은 false로 렌더링할 수 있습니다.
	// 이 구현에서는 Hydration Mismatch를 방지하기 위해 isInitialized 완료 전에는 기본값 false인 상태로 렌더링하게 둡니다.
	// 하지만 만약 UI가 처음부터 true로 그려져야 한다면 다른 방법을 고려해야 합니다.
	// 지금은 "클라이언트 측에서만 동작"하는 심플한 구조를 목표로 하므로 useState 기본값 false로 먼저 렌더링됩니다.

	return (
		<AUTH_CONTEXT.Provider value={{ isAuthenticated, setIsAuthenticated, logout }}>{children}</AUTH_CONTEXT.Provider>
	);
}
