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

	return (
		<LOGIN_MODAL_CONTEXT.Provider value={login}>
			{children}
			<LoginModal open={isOpen} onClose={close} />
		</LOGIN_MODAL_CONTEXT.Provider>
	);
}
