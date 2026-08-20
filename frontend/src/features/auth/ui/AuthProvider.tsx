'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';

import { AUTH_CONTEXT } from '../model/auth-context';

interface AuthProviderProps {
	children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isInitialized, setIsInitialized] = useState(false);

	const logout = useCallback(() => {
		tokenManager.clearToken();
		setIsAuthenticated(false);
	}, []);

	useEffect(() => {
		const initializeAuth = async () => {
			let token = tokenManager.getToken();

			// 메모리에 토큰이 없다면 (ex: 새로고침 직후) 재발급 시도
			if (!token) {
				token = await tokenManager.refresh();
			}

			setIsAuthenticated(token !== null);
			setIsInitialized(true);
		};

		void initializeAuth();

		// 백엔드 요청 중 토큰 재발급 실패(완전 만료) 시 자동 로그아웃 처리
		const unsubscribe = tokenManager.subscribeLogout(() => {
			logout();
		});

		return unsubscribe;
	}, [logout]);

	return (
		<AUTH_CONTEXT.Provider value={{ isAuthenticated, isInitialized, setIsAuthenticated, logout }}>
			{/* 초기화 완료 전에 UI를 가리거나 그대로 둘 수 있습니다. 여기서는 기존처럼 그대로 렌더링합니다. */}
			{children}
		</AUTH_CONTEXT.Provider>
	);
}
