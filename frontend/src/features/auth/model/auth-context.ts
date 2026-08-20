import { createContext } from 'react';

export interface AuthContextValue {
	isAuthenticated: boolean;
	isInitialized: boolean;
	setIsAuthenticated: (value: boolean) => void;
	logout: () => void;
}

export const AUTH_CONTEXT = createContext<AuthContextValue | null>(null);
