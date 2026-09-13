'use client';

import { useEffect, useRef } from 'react';

import type { PostNavigationSurface } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';

import { usePostNavigationVisit } from '../model/post-navigation-visit-context';

interface PostNavigationAvailableTrackerProps {
	surface: PostNavigationSurface;
}

export default function PostNavigationAvailableTracker({ surface }: PostNavigationAvailableTrackerProps) {
	const visit = usePostNavigationVisit();
	const hasTrackedRef = useRef(false);

	useEffect(() => {
		if (hasTrackedRef.current || visit === null || visit.chapterId === null) {
			return;
		}

		hasTrackedRef.current = true;
		analytics.postNavigationAvailable({
			navigationVisitId: visit.getNavigationVisitId(),
			postId: visit.postId,
			ownerType: visit.ownerType,
			chapterId: visit.chapterId,
			surface,
		});
	}, [surface, visit]);

	return null;
}
