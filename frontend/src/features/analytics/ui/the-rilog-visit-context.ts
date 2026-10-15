import { createContext } from 'react';

export const THE_RILOG_VISIT_CONTEXT = createContext<(() => string) | null>(null);
