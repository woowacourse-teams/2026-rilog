'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useActiveElapsedTime(resetKey?: unknown) {
	const startedAtRef = useRef<number | null>(null);
	const hiddenAtRef = useRef<number | null>(null);
	const hiddenDurationRef = useRef(0);

	useEffect(() => {
		const startedAt = Date.now();
		startedAtRef.current = startedAt;
		hiddenDurationRef.current = 0;
		hiddenAtRef.current = document.visibilityState === 'hidden' ? startedAt : null;

		const handleVisibilityChange = () => {
			const now = Date.now();

			if (document.visibilityState === 'hidden') {
				hiddenAtRef.current ??= now;
				return;
			}

			if (hiddenAtRef.current !== null) {
				hiddenDurationRef.current += Math.max(0, now - hiddenAtRef.current);
				hiddenAtRef.current = null;
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [resetKey]);

	return useCallback(() => {
		const now = Date.now();
		const startedAt = startedAtRef.current ?? now;
		const currentHiddenDuration = hiddenAtRef.current === null ? 0 : Math.max(0, now - hiddenAtRef.current);

		return Math.max(0, now - startedAt - hiddenDurationRef.current - currentHiddenDuration);
	}, []);
}
