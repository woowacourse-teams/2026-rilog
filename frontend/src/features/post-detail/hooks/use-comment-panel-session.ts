'use client';

import { createContext, useContext, useMemo } from 'react';

import { useModalOpen } from '@/shared/ui/modal/modal-open-context';

export interface CommentPanelSession {
	isOpen: boolean;
	scrollResetKey: number;
}

export const COMMENT_PANEL_SESSION_CONTEXT = createContext<CommentPanelSession>({ isOpen: true, scrollResetKey: 0 });

export const useCommentPanelSession = () => useContext(COMMENT_PANEL_SESSION_CONTEXT);

export const useCommentPanelSessionValue = (isOpen: boolean | undefined, scrollResetKey: number) => {
	const modalOpen = useModalOpen();
	const resolvedOpen = isOpen ?? modalOpen ?? true;
	return useMemo(() => ({ isOpen: resolvedOpen, scrollResetKey }), [resolvedOpen, scrollResetKey]);
};
