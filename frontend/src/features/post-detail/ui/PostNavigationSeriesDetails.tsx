'use client';

import type { ComponentProps, ReactNode } from 'react';

import { analytics } from '@/features/analytics/model/events';

import { usePostNavigationVisit } from '../model/post-navigation-visit-context';

interface PostNavigationSeriesDetailsProps extends ComponentProps<'details'> {
	children: ReactNode;
}

export default function PostNavigationSeriesDetails({
	children,
	onToggle,
	...detailsProps
}: PostNavigationSeriesDetailsProps) {
	const visit = usePostNavigationVisit();

	const handleToggle: NonNullable<ComponentProps<'details'>['onToggle']> = (event) => {
		onToggle?.(event);

		if (!event.currentTarget.open || visit === null || visit.chapterId === null) {
			return;
		}

		analytics.postSeriesExpanded({
			navigationVisitId: visit.getNavigationVisitId(),
			postId: visit.postId,
			ownerType: visit.ownerType,
			chapterId: visit.chapterId,
		});
	};

	return (
		<details {...detailsProps} onToggle={handleToggle}>
			{children}
		</details>
	);
}
