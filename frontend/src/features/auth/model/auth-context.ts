import { createContext } from 'react';

export interface AuthContextValue {
	isAuthenticated: boolean;
	isInitialized: boolean;
}

export const AUTH_CONTEXT = createContext<AuthContextValue | null>(null);
