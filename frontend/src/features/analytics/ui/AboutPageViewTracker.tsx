'use client';

import { useEffect, useRef } from 'react';

import { getAboutPageAcquisitionSource } from '@/features/analytics/lib/about-page-acquisition';
import { analytics } from '@/features/analytics/model/events';

export default function AboutPageViewTracker() {
	const hasTrackedViewRef = useRef(false);

	useEffect(() => {
		if (hasTrackedViewRef.current) {
			return;
		}

		hasTrackedViewRef.current = true;
		analytics.aboutPageViewed({ acquisitionSource: getAboutPageAcquisitionSource(window.location.search) });
	}, []);

	return null;
}
