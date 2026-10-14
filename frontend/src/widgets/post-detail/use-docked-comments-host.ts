'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { getPostCommentsDockHostId } from './get-post-comments-dock-host-id';

const DOCKED_COMMENTS_MEDIA_QUERY = '(min-width: 1280px)';

const subscribeToViewport = (onChange: () => void) => {
	if (!window.matchMedia) return () => {};
	const mediaQuery = window.matchMedia(DOCKED_COMMENTS_MEDIA_QUERY);
	mediaQuery.addEventListener('change', onChange);
	return () => mediaQuery.removeEventListener('change', onChange);
};

const getServerSnapshot = () => undefined;

export function useDockedCommentsHost(postId: number): HTMLElement | null | undefined {
	const getSnapshot = useCallback(() => {
		const host = document.getElementById(getPostCommentsDockHostId(postId));
		return host && window.matchMedia(DOCKED_COMMENTS_MEDIA_QUERY).matches ? host : null;
	}, [postId]);

	return useSyncExternalStore(subscribeToViewport, getSnapshot, getServerSnapshot);
}
