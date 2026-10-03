'use client';

import { useCallback, useEffect, useRef } from 'react';

interface ActiveElapsedTimeThreshold {
	thresholdMs: number;
	onThresholdReached: (elapsedMs: number) => void;
}

export function useActiveElapsedTime(resetKey?: unknown, threshold?: ActiveElapsedTimeThreshold) {
	const startedAtRef = useRef<number | null>(null);
	const hiddenAtRef = useRef<number | null>(null);
	const hiddenDurationRef = useRef(0);

	const previousResetKeyRef = useRef(resetKey);
	const didReachThresholdRef = useRef(false);
	const onThresholdReached = threshold?.onThresholdReached;
	const thresholdMs = threshold?.thresholdMs;

	const getActiveElapsedTime = useCallback(() => {
		const now = Date.now();
		const startedAt = startedAtRef.current ?? now;
		const currentHiddenDuration = hiddenAtRef.current === null ? 0 : Math.max(0, now - hiddenAtRef.current);

		return Math.max(0, now - startedAt - hiddenDurationRef.current - currentHiddenDuration);
	}, []);

	useEffect(() => {
		if (startedAtRef.current === null || !Object.is(previousResetKeyRef.current, resetKey)) {
			previousResetKeyRef.current = resetKey;
			didReachThresholdRef.current = false;
			const startedAt = Date.now();
			startedAtRef.current = startedAt;
			hiddenDurationRef.current = 0;
			hiddenAtRef.current = document.visibilityState === 'hidden' ? startedAt : null;
		}

		let thresholdTimer: number | undefined;
		const clearThresholdTimer = () => {
			window.clearTimeout(thresholdTimer);
			thresholdTimer = undefined;
		};
		const scheduleThreshold = () => {
			clearThresholdTimer();
			if (
				document.visibilityState !== 'visible' ||
				didReachThresholdRef.current ||
				thresholdMs === undefined ||
				onThresholdReached === undefined
			) {
				return;
			}

			const remainingMs = thresholdMs - getActiveElapsedTime();
			thresholdTimer = window.setTimeout(
				() => {
					thresholdTimer = undefined;
					if (document.visibilityState !== 'visible') {
						return;
					}
					const elapsedMs = getActiveElapsedTime();
					if (elapsedMs < thresholdMs) {
						scheduleThreshold();
						return;
					}
					didReachThresholdRef.current = true;
					onThresholdReached(elapsedMs);
				},
				Math.max(0, remainingMs),
			);
		};

		const handleVisibilityChange = () => {
			const now = Date.now();

			if (document.visibilityState === 'hidden') {
				clearThresholdTimer();
				hiddenAtRef.current ??= now;
				return;
			}

			if (hiddenAtRef.current !== null) {
				hiddenDurationRef.current += Math.max(0, now - hiddenAtRef.current);
				hiddenAtRef.current = null;
			}
			scheduleThreshold();
		};

		scheduleThreshold();
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			clearThresholdTimer();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [getActiveElapsedTime, onThresholdReached, resetKey, thresholdMs]);

	return getActiveElapsedTime;
}
