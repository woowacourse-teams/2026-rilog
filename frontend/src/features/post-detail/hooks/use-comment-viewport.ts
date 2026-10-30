'use client';

import { useCallback, useSyncExternalStore } from 'react';

const COMMENT_VIEWPORT_QUERIES = {
	mobile: '(max-width: 767px)',
	desktop: '(min-width: 768px)',
};
const getServerViewport = () => false;

export function useCommentViewport(mode: 'mobile' | 'desktop') {
	const query = COMMENT_VIEWPORT_QUERIES[mode];
	const subscribe = useCallback(
		(onChange: () => void) => {
			const media = window.matchMedia?.(query);
			media?.addEventListener('change', onChange);
			return () => media?.removeEventListener('change', onChange);
		},
		[query],
	);
	const getSnapshot = useCallback(() => window.matchMedia?.(query).matches ?? false, [query]);
	return useSyncExternalStore(subscribe, getSnapshot, getServerViewport);
}
