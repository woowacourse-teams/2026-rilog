'use client';

import { createContext, useContext } from 'react';

export interface CommentPanelSession {
	isOpen: boolean;
	scrollResetKey: number;
}

export const COMMENT_PANEL_SESSION_CONTEXT = createContext<CommentPanelSession>({ isOpen: true, scrollResetKey: 0 });

export const useCommentPanelSession = () => useContext(COMMENT_PANEL_SESSION_CONTEXT);
