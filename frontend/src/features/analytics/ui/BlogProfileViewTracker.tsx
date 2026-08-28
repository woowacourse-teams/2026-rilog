'use client';

import { useEffect } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import { analytics } from '@/features/analytics/model/events';

interface BlogProfileViewTrackerProps {
	blogType: BlogType;
}

export default function BlogProfileViewTracker({ blogType }: BlogProfileViewTrackerProps) {
	useEffect(() => {
		analytics.blogProfileViewed({ blogType });
	}, [blogType]);

	return null;
}
