'use client';

import { useEffect, useRef } from 'react';

import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import type { ContentLoadPhase, ContentLoadSurface } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';

interface ContentLoadFailureTrackerProps {
	surface: ContentLoadSurface;
	loadPhase: ContentLoadPhase;
	error?: unknown;
}

export default function ContentLoadFailureTracker({ surface, loadPhase, error }: ContentLoadFailureTrackerProps) {
	const hasTrackedRef = useRef(false);

	useEffect(() => {
		if (hasTrackedRef.current) {
			return;
		}

		const { errorCode, errorKind } = getAnalyticsErrorProperties(error);
		analytics.contentLoadFailed({ surface, loadPhase, errorCode, errorKind });
		hasTrackedRef.current = true;
	}, [error, loadPhase, surface]);

	return null;
}
