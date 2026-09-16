'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { clearProxySession, registerProxySession } from '@/shared/api/proxy/api';

import { AUTH_CONTEXT } from '../model/auth-context';

interface AuthProviderProps {
	children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const [sessionStatus, setSessionStatus] = useState<'anonymous' | 'onboarding' | 'authenticated'>('anonymous');
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		let isActive = true;
		const registerSession = async (status: 'onboarding' | 'authenticated') => {
			try {
				await registerProxySession();
			} finally {
				if (isActive) {
					setSessionStatus(status);
				}
			}
		};
		const unsubscribeLogin = tokenManager.subscribeLogin(() => registerSession('authenticated'));
		const unsubscribeOnboarding = tokenManager.subscribeOnboarding(() => registerSession('onboarding'));

		const unsubscribeLogout = tokenManager.subscribeLogout(async () => {
			if (isActive) {
				setSessionStatus('anonymous');
			}

			await clearProxySession();
		});

		const initializeAuth = async () => {
			let token = tokenManager.getToken();

			// 메모리에 토큰이 없다면 (ex: 새로고침 직후) 재발급 시도
			if (!token) {
				token = await tokenManager.refresh();
			}

			if (token) {
				if (tokenManager.getTokenType() === 'onboarding') {
					await tokenManager.publishOnboarding(token);
				} else {
					await tokenManager.publishLogin(token);
				}
			}

			if (isActive) {
				setIsInitialized(true);
			}
		};

		void initializeAuth();

		return () => {
			isActive = false;
			unsubscribeLogin();
			unsubscribeOnboarding();
			unsubscribeLogout();
		};
	}, []);

	return (
		<AUTH_CONTEXT.Provider
			value={{
				isAuthenticated: sessionStatus === 'authenticated',
				isOnboarding: sessionStatus === 'onboarding',
				isInitialized,
			}}
		>
			{/* 초기화 완료 전에 UI를 가리거나 그대로 둘 수 있습니다. 여기서는 기존처럼 그대로 렌더링합니다. */}
			{children}
		</AUTH_CONTEXT.Provider>
	);
}
