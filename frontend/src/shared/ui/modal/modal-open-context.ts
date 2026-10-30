'use client';

import { createContext, useContext } from 'react';

export const MODAL_OPEN_CONTEXT = createContext<boolean | null>(null);
export const useModalOpen = () => useContext(MODAL_OPEN_CONTEXT);
