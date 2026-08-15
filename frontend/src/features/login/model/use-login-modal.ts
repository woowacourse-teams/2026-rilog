'use client';

import { useContext } from 'react';

import { LOGIN_MODAL_CONTEXT } from './login-modal-context';

export const useLoginModal = () => {
	const login = useContext(LOGIN_MODAL_CONTEXT);

	if (login === null) {
		throw new Error('useLoginModal은 LoginModalProvider 안에서 사용해야 합니다.');
	}

	return login;
};
