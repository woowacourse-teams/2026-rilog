'use client';

import { useCallback, useState } from 'react';

import type { ReactNode } from 'react';

import LoginModal from '../ui/LoginModal';

import { LOGIN_MODAL_CONTEXT } from './login-modal-context';

interface LoginModalProviderProps {
	children: ReactNode;
}

export default function LoginModalProvider({ children }: LoginModalProviderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const login = useCallback(() => setIsOpen(true), []);
	const close = useCallback(() => setIsOpen(false), []);

	const handleGitHubLogin = useCallback(() => {
		const currentUrl = window.location.pathname + window.location.search;
		localStorage.setItem('postLoginRedirect', currentUrl);

		const frontendCallbackUrl = '/auth/github/callback';
		const backendAuthUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/github?redirectUrl=${frontendCallbackUrl}`;
		window.location.href = backendAuthUrl;
	}, []);

	return (
		<LOGIN_MODAL_CONTEXT.Provider value={login}>
			{children}
			<LoginModal open={isOpen} onClose={close} onGitHubLogin={handleGitHubLogin} />
		</LOGIN_MODAL_CONTEXT.Provider>
	);
}
