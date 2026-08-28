import { useContext } from 'react';

import { AUTH_CONTEXT } from './auth-context';

export const useAuth = () => {
	const context = useContext(AUTH_CONTEXT);

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}

	return context;
};
