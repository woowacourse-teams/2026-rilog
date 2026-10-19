import { createContext } from 'react';

export interface AuthContextValue {
	isAuthenticated: boolean;
	isOnboarding: boolean;
	isInitialized: boolean;
	sessionVersion: number;
}

export const AUTH_CONTEXT = createContext<AuthContextValue | null>(null);
