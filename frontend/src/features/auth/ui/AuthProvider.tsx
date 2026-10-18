'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { clearProxySession, registerProxySession } from '@/shared/api/proxy/api';

import { AUTH_CONTEXT } from '../model/auth-context';

interface AuthProviderProps {
	children: ReactNode;
}

interface AuthSessionState {
	status: 'anonymous' | 'onboarding' | 'authenticated';
	isInitialized: boolean;
	sessionVersion: number;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const [session, setSession] = useState<AuthSessionState>(() => ({
		status: 'anonymous',
		isInitialized: false,
		sessionVersion: tokenManager.getSessionVersion(),
	}));

	useEffect(() => {
		let isActive = true;
		const registerSession = async (status: 'onboarding' | 'authenticated') => {
			const sessionVersion = tokenManager.getSessionVersion();
			if (!isActive) return;
			setSession({ status: 'anonymous', isInitialized: false, sessionVersion });
			try {
				await registerProxySession();
			} finally {
				if (isActive && sessionVersion === tokenManager.getSessionVersion()) {
					setSession({ status, isInitialized: true, sessionVersion });
				}
			}
		};
		const unsubscribeLogin = tokenManager.subscribeLogin(() => registerSession('authenticated'));
		const unsubscribeOnboarding = tokenManager.subscribeOnboarding(() => registerSession('onboarding'));

		const unsubscribeLogout = tokenManager.subscribeLogout(async () => {
			if (isActive) {
				setSession({ status: 'anonymous', isInitialized: true, sessionVersion: tokenManager.getSessionVersion() });
			}

			await clearProxySession();
		});

		const initializeAuth = async () => {
			const sessionVersion = tokenManager.getSessionVersion();
			let token = tokenManager.getToken();

			// 메모리에 토큰이 없다면 (ex: 새로고침 직후) 재발급 시도
			if (!token) {
				token = await tokenManager.refresh();
			}

			if (token && isActive && sessionVersion === tokenManager.getSessionVersion()) {
				if (tokenManager.getTokenType() === 'onboarding') {
					await tokenManager.publishOnboarding(token);
				} else {
					await tokenManager.publishLogin(token);
				}
			}

			if (isActive && sessionVersion === tokenManager.getSessionVersion() && !token) {
				setSession({ status: 'anonymous', isInitialized: true, sessionVersion });
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
				isAuthenticated: session.status === 'authenticated',
				isOnboarding: session.status === 'onboarding',
				isInitialized: session.isInitialized,
				sessionVersion: session.sessionVersion,
			}}
		>
			{children}
		</AUTH_CONTEXT.Provider>
	);
}
