'use client';

import { useEffect } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import { consumeBlogProfileEntryContext } from '@/features/analytics/lib/blog-profile-entry-context';
import { analytics } from '@/features/analytics/model/events';

interface BlogProfileViewTrackerProps {
	blogType: BlogType;
	blogId: number;
}

export default function BlogProfileViewTracker({ blogType, blogId }: BlogProfileViewTrackerProps) {
	useEffect(() => {
		const entrySource = consumeBlogProfileEntryContext(window.location.pathname);
		if (entrySource === null) {
			return;
		}

		analytics.blogProfileViewed({
			blogType,
			blogId,
			entrySource,
			profileVisitId: window.crypto.randomUUID(),
		});
	}, [blogId, blogType]);

	return null;
}
