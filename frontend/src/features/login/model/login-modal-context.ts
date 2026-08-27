import { createContext } from 'react';

import type { LoginEntrySurface } from '@/features/analytics/model/analytics-event';

export type { LoginEntrySurface } from '@/features/analytics/model/analytics-event';

export interface LoginOptions {
	entrySurface?: LoginEntrySurface;
}

export type Login = (options?: LoginOptions) => void;

export const LOGIN_MODAL_CONTEXT = createContext<Login | null>(null);
