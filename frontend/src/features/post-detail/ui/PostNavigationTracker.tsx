'use client';

import { createContext, useContext, useEffect, useId, useRef } from 'react';

import type { ComponentProps, MouseEvent, ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type {
	PostNavigationClickPart,
	PostNavigationSurface,
	PostNavigationTargetType,
} from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import CustomLink from '@/shared/ui/link/CustomLink';

interface PostNavigationVisitContextValue {
	chapterId: number | null;
	navigationVisitId: string | null;
	ownerType: BlogType;
	postId: number;
}

interface PostNavigationVisitProviderProps {
	chapterId: number | null;
	children: ReactNode;
	ownerType: BlogType;
	postId: number;
}

interface PostNavigationAvailableTrackerProps {
	surface: PostNavigationSurface;
}

interface PostNavigationLinkProps extends ComponentProps<typeof CustomLink> {
	clickPart: PostNavigationClickPart;
	position: number;
	surface: PostNavigationSurface;
	targetPostId?: number;
	targetType: PostNavigationTargetType;
}

interface PostNavigationSeriesDetailsProps extends ComponentProps<'details'> {
	children: ReactNode;
}

const postNavigationVisitContext = createContext<PostNavigationVisitContextValue | null>(null);

const usePostNavigationVisit = () => useContext(postNavigationVisitContext);

function PostNavigationVisitProvider({ chapterId, children, ownerType, postId }: PostNavigationVisitProviderProps) {
	const navigationVisitId = `post-navigation:${postId}:${useId()}`;

	return (
		<postNavigationVisitContext.Provider value={{ chapterId, navigationVisitId, ownerType, postId }}>
			{children}
		</postNavigationVisitContext.Provider>
	);
}

function PostNavigationAvailableTracker({ surface }: PostNavigationAvailableTrackerProps) {
	const visit = usePostNavigationVisit();
	const hasTrackedRef = useRef(false);

	useEffect(() => {
		if (hasTrackedRef.current || visit === null || visit.navigationVisitId === null || visit.chapterId === null) {
			return;
		}

		hasTrackedRef.current = true;
		analytics.postNavigationAvailable({
			navigationVisitId: visit.navigationVisitId,
			postId: visit.postId,
			ownerType: visit.ownerType,
			chapterId: visit.chapterId,
			surface,
		});
	}, [surface, visit]);

	return null;
}

function PostNavigationLink({
	clickPart,
	position,
	surface,
	targetPostId,
	targetType,
	...linkProps
}: PostNavigationLinkProps) {
	const visit = usePostNavigationVisit();

	const trackNavigationClick = () => {
		if (visit === null || visit.navigationVisitId === null || visit.chapterId === null) {
			return;
		}

		analytics.postNavigationClicked({
			navigationVisitId: visit.navigationVisitId,
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

	return <CustomLink {...linkProps} onClick={handleClick} onAuxClick={handleAuxClick} />;
}

function PostNavigationSeriesDetails({ children, onToggle, ...detailsProps }: PostNavigationSeriesDetailsProps) {
	const visit = usePostNavigationVisit();

	const handleToggle: NonNullable<ComponentProps<'details'>['onToggle']> = (event) => {
		onToggle?.(event);

		if (!event.currentTarget.open || visit === null || visit.navigationVisitId === null || visit.chapterId === null) {
			return;
		}

		analytics.postSeriesExpanded({
			navigationVisitId: visit.navigationVisitId,
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

const postNavigationTracker = {
	VisitProvider: PostNavigationVisitProvider,
	AvailableTracker: PostNavigationAvailableTracker,
	Link: PostNavigationLink,
	SeriesDetails: PostNavigationSeriesDetails,
};

export default postNavigationTracker;
