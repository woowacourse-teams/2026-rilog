import { createContext } from 'react';

export type Login = () => void;

export const LOGIN_MODAL_CONTEXT = createContext<Login | null>(null);
