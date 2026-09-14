'use client';

import { useEffect, useRef } from 'react';

import type { FeedCategory, FeedScope } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';

interface FeedViewTrackerProps {
	feedScope: FeedScope;
	category: FeedCategory;
	isVisible: boolean;
}

interface ViewedFeedFilters {
	feedScope: FeedScope;
	category: FeedCategory;
}

export default function FeedViewTracker({ feedScope, category, isVisible }: FeedViewTrackerProps) {
	const lastViewedFeedRef = useRef<ViewedFeedFilters | null>(null);

	useEffect(() => {
		const lastViewedFeed = lastViewedFeedRef.current;
		if (!isVisible || (lastViewedFeed?.feedScope === feedScope && lastViewedFeed.category === category)) {
			return;
		}

		lastViewedFeedRef.current = { feedScope, category };
		analytics.feedViewed({ feedScope, category });
	}, [category, feedScope, isVisible]);

	return null;
}
