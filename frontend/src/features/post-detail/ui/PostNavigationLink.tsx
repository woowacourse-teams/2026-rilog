'use client';

import type { ComponentProps, MouseEvent } from 'react';

import type {
	BlogProfileEntrySource,
	PostNavigationClickPart,
	PostNavigationSurface,
	PostNavigationTargetType,
} from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import BlogProfileEntryLink from '@/features/analytics/ui/BlogProfileEntryLink';
import CustomLink from '@/shared/ui/link/CustomLink';

import { usePostNavigationVisit } from '../model/post-navigation-visit-context';

interface PostNavigationLinkProps extends Omit<ComponentProps<typeof CustomLink>, 'href'> {
	clickPart: PostNavigationClickPart;
	entrySource?: BlogProfileEntrySource;
	href: string;
	position: number;
	surface: PostNavigationSurface;
	targetPostId?: number;
	targetType: PostNavigationTargetType;
}

export default function PostNavigationLink({
	clickPart,
	entrySource,
	position,
	surface,
	targetPostId,
	targetType,
	...linkProps
}: PostNavigationLinkProps) {
	const visit = usePostNavigationVisit();

	const trackNavigationClick = () => {
		if (visit === null || visit.chapterId === null) {
			return;
		}

		analytics.postNavigationClicked({
			navigationVisitId: visit.getNavigationVisitId(),
			postId: visit.postId,
			ownerType: visit.ownerType,
			chapterId: visit.chapterId,
			surface,
			targetType,
			targetPostId: targetPostId ?? null,
			position,
			clickPart,
		});
	};

	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (event.button === 0) {
			trackNavigationClick();
		}
	};

	const handleAuxClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (event.button === 1) {
			trackNavigationClick();
		}
	};

	if (entrySource !== undefined) {
		return (
			<BlogProfileEntryLink
				{...linkProps}
				entrySource={entrySource}
				onClick={handleClick}
				onAuxClick={handleAuxClick}
			/>
		);
	}

	return <CustomLink {...linkProps} onClick={handleClick} onAuxClick={handleAuxClick} />;
}
