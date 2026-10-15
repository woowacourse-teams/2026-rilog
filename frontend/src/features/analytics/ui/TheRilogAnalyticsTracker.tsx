'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ReactNode } from 'react';

import { analytics } from '@/features/analytics/model/events';
import { useActiveElapsedTime } from '@/shared/hooks/use-active-elapsed-time';

import { THE_RILOG_VISIT_CONTEXT } from './the-rilog-visit-context';

interface TheRilogAnalyticsTrackerProps {
	children: ReactNode;
}

export default function TheRilogAnalyticsTracker({ children }: TheRilogAnalyticsTrackerProps) {
	const visitIdRef = useRef<string | null>(null);
	const hasViewedRef = useRef(false);
	const lastSecondsRef = useRef<number | null>(null);
	const [visitGeneration, setVisitGeneration] = useState(0);
	const getVisitId = useCallback(() => {
		visitIdRef.current ??= crypto.randomUUID();
		return visitIdRef.current;
	}, []);
	const emitEngagement = useCallback(
		(elapsedMs: number, useBeacon = false) => {
			const engagementSeconds = Math.floor(elapsedMs / 1000);
			if (lastSecondsRef.current !== null && engagementSeconds <= lastSecondsRef.current) return;
			lastSecondsRef.current = engagementSeconds;
			analytics.theRilogEngagementUpdated({ theRilogVisitId: getVisitId(), engagementSeconds }, useBeacon);
		},
		[getVisitId],
	);
	const getElapsedTime = useActiveElapsedTime(visitGeneration, {
		intervalMs: 15_000,
		onInterval: emitEngagement,
	});

	useEffect(() => {
		const beginVisit = () => {
			analytics.theRilogViewed({ theRilogVisitId: getVisitId() });
			emitEngagement(0);
		};
		if (!hasViewedRef.current) {
			hasViewedRef.current = true;
			beginVisit();
		}
		const flush = () => emitEngagement(getElapsedTime(), true);
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') flush();
		};
		const handlePageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			visitIdRef.current = crypto.randomUUID();
			lastSecondsRef.current = null;
			setVisitGeneration((generation) => generation + 1);
			beginVisit();
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pagehide', flush);
		window.addEventListener('pageshow', handlePageShow);
		return () => {
			flush();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pagehide', flush);
			window.removeEventListener('pageshow', handlePageShow);
		};
	}, [emitEngagement, getElapsedTime, getVisitId]);

	return <THE_RILOG_VISIT_CONTEXT value={getVisitId}>{children}</THE_RILOG_VISIT_CONTEXT>;
}
