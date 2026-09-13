'use client';

import { useEffect, useRef } from 'react';

import type { FeedScope } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';

interface FeedScopeViewTrackerProps {
	feedScope: FeedScope;
	isVisible: boolean;
}

export default function FeedScopeViewTracker({ feedScope, isVisible }: FeedScopeViewTrackerProps) {
	const lastViewedFeedScopeRef = useRef<FeedScope | null>(null);

	useEffect(() => {
		if (!isVisible || lastViewedFeedScopeRef.current === feedScope) {
			return;
		}

		lastViewedFeedScopeRef.current = feedScope;
		analytics.feedScopeViewed({ feedScope });
	}, [feedScope, isVisible]);

	return null;
}
