'use client';

import { useCallback, useEffect, useRef } from 'react';

interface ActiveElapsedTimeInterval {
	intervalMs: number;
	onInterval: (elapsedMs: number) => void;
}

export function useActiveElapsedTime(resetKey?: unknown, interval?: ActiveElapsedTimeInterval) {
	const startedAtRef = useRef<number | null>(null);
	const hiddenAtRef = useRef<number | null>(null);
	const hiddenDurationRef = useRef(0);

	const previousResetKeyRef = useRef(resetKey);
	const lastIntervalIndexRef = useRef(0);
	const onInterval = interval?.onInterval;
	const intervalMs = interval?.intervalMs;

	const getActiveElapsedTime = useCallback(() => {
		const now = Date.now();
		const startedAt = startedAtRef.current ?? now;
		const currentHiddenDuration = hiddenAtRef.current === null ? 0 : Math.max(0, now - hiddenAtRef.current);

		return Math.max(0, now - startedAt - hiddenDurationRef.current - currentHiddenDuration);
	}, []);

	useEffect(() => {
		if (startedAtRef.current === null || !Object.is(previousResetKeyRef.current, resetKey)) {
			previousResetKeyRef.current = resetKey;
			lastIntervalIndexRef.current = 0;
			const startedAt = Date.now();
			startedAtRef.current = startedAt;
			hiddenDurationRef.current = 0;
			hiddenAtRef.current = document.visibilityState === 'hidden' ? startedAt : null;
		}

		let intervalTimer: number | undefined;
		const clearIntervalTimer = () => {
			window.clearTimeout(intervalTimer);
			intervalTimer = undefined;
		};
		const scheduleInterval = () => {
			clearIntervalTimer();
			if (document.visibilityState !== 'visible' || intervalMs === undefined || onInterval === undefined) {
				return;
			}

			const scheduledElapsedMs = getActiveElapsedTime();
			const remainingMs = (Math.floor(scheduledElapsedMs / intervalMs) + 1) * intervalMs - scheduledElapsedMs;
			intervalTimer = window.setTimeout(
				() => {
					intervalTimer = undefined;
					if (document.visibilityState !== 'visible') {
						return;
					}
					const elapsedMs = getActiveElapsedTime();
					const intervalIndex = Math.floor(elapsedMs / intervalMs);
					if (intervalIndex > lastIntervalIndexRef.current) {
						lastIntervalIndexRef.current = intervalIndex;
						onInterval(elapsedMs);
					}
					scheduleInterval();
				},
				Math.max(0, remainingMs),
			);
		};

		const pause = () => {
			const now = Date.now();
			clearIntervalTimer();
			hiddenAtRef.current ??= now;
		};

		const resume = () => {
			const now = Date.now();
			if (hiddenAtRef.current !== null) {
				hiddenDurationRef.current += Math.max(0, now - hiddenAtRef.current);
				hiddenAtRef.current = null;
			}
			scheduleInterval();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				pause();
			} else {
				resume();
			}
		};
		const handlePageShow = () => {
			if (document.visibilityState === 'visible') {
				resume();
			}
		};

		scheduleInterval();
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pagehide', pause);
		window.addEventListener('pageshow', handlePageShow);

		return () => {
			clearIntervalTimer();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pagehide', pause);
			window.removeEventListener('pageshow', handlePageShow);
		};
	}, [getActiveElapsedTime, onInterval, resetKey, intervalMs]);

	return getActiveElapsedTime;
}
