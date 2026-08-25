'use client';

import { useCallback, useState } from 'react';

import type { ReactNode } from 'react';

import { analytics } from '@/features/analytics/model/events';

import LoginModal from '../ui/LoginModal';

import { LOGIN_MODAL_CONTEXT } from './login-modal-context';

interface LoginModalProviderProps {
	children: ReactNode;
}

export default function LoginModalProvider({ children }: LoginModalProviderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoginPending, setIsLoginPending] = useState(false);
	const login = useCallback(() => {
		setIsLoginPending(false);
		setIsOpen(true);
	}, []);
	const close = useCallback(() => {
		setIsLoginPending(false);
		setIsOpen(false);
	}, []);

	const handleGitHubLogin = useCallback(() => {
		analytics.githubLoginStarted();
		setIsLoginPending(true);

		const currentUrl = window.location.pathname + window.location.search;
		localStorage.setItem('postLoginRedirect', currentUrl);

		const frontendCallbackUrl = '/auth/github/callback';
		const backendAuthUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/github?redirectUrl=${frontendCallbackUrl}`;
		// GitHub OAuth는 백엔드 origin으로 전체 페이지를 이동해야 하므로 Next Router를 사용할 수 없다.
		// eslint-disable-next-line @next/next/no-location-assign-relative-destination
		window.location.href = backendAuthUrl;
	}, []);

	return (
		<LOGIN_MODAL_CONTEXT.Provider value={login}>
			{children}
			<LoginModal open={isOpen} onClose={close} onGitHubLogin={handleGitHubLogin} isPending={isLoginPending} />
		</LOGIN_MODAL_CONTEXT.Provider>
	);
}
