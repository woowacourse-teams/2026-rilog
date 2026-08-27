'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import type { MouseEvent } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { consumePostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { analytics } from '@/features/analytics/model/events';
import { useActiveElapsedTime } from '@/shared/hooks/use-active-elapsed-time';

interface PostDetailContentProps {
	html: string;
	postId: number;
	ownerType: BlogType;
	category: PostCategory;
}

const trackerMountCounts = new Map<string, number>();
const trackerCleanupTimers = new Map<string, number>();
const viewedTrackerKeys = new Set<string>();
const engagedTrackerKeys = new Set<string>();
const READ_ENGAGED_SCROLL_DEPTH_THRESHOLD = 0.5;
const READ_ENGAGED_SCROLL_DEPTH_BUCKET = '50_percent';

const retainTrackerKey = (trackerKey: string) => {
	const pendingCleanupTimer = trackerCleanupTimers.get(trackerKey);
	if (pendingCleanupTimer !== undefined) {
		window.clearTimeout(pendingCleanupTimer);
		trackerCleanupTimers.delete(trackerKey);
	}

	trackerMountCounts.set(trackerKey, (trackerMountCounts.get(trackerKey) ?? 0) + 1);
};

const releaseTrackerKey = (trackerKey: string) => {
	const currentMountCount = trackerMountCounts.get(trackerKey) ?? 0;
	if (currentMountCount > 1) {
		trackerMountCounts.set(trackerKey, currentMountCount - 1);
		return;
	}

	trackerMountCounts.delete(trackerKey);
	const cleanupTimer = window.setTimeout(() => {
		trackerCleanupTimers.delete(trackerKey);
		viewedTrackerKeys.delete(trackerKey);
		engagedTrackerKeys.delete(trackerKey);
	}, 0);
	trackerCleanupTimers.set(trackerKey, cleanupTimer);
};

const getTrackerKey = (postId: number) => `${window.location.pathname}::${postId}`;

const getArticleScrollDepth = (articleElement: HTMLElement) => {
	const articleRect = articleElement.getBoundingClientRect();
	const articleHeight = articleRect.height || articleElement.offsetHeight;
	if (articleHeight <= 0) {
		return 0;
	}

	return Math.min(Math.max((window.innerHeight - articleRect.top) / articleHeight, 0), 1);
};

const getToggleButton = (target: EventTarget | null): HTMLButtonElement | null => {
	if (!(target instanceof Element)) {
		return null;
	}

	return target.closest<HTMLButtonElement>('button[data-post-detail-toggle]');
};

const setToggleExpanded = (toggleButton: HTMLButtonElement, isExpanded: boolean) => {
	const toggleWrapper = toggleButton.closest<HTMLElement>('.bn-toggle-wrapper');
	if (toggleWrapper === null) {
		return;
	}

	toggleWrapper.dataset.showChildren = String(isExpanded);
	toggleButton.setAttribute('aria-expanded', String(isExpanded));
	toggleButton.setAttribute('aria-label', isExpanded ? '하위 내용 접기' : '하위 내용 펼치기');
};

export default function PostDetailContent({ html, postId, ownerType, category }: PostDetailContentProps) {
	const contentRef = useRef<HTMLElement>(null);
	const currentPostIdRef = useRef(postId);
	const expandedToggleIdsRef = useRef(new Set<string>());
	const getActiveEngagementTime = useActiveElapsedTime(postId);

	useLayoutEffect(() => {
		const contentElement = contentRef.current;
		if (contentElement === null) {
			return;
		}

		if (currentPostIdRef.current !== postId) {
			currentPostIdRef.current = postId;
			expandedToggleIdsRef.current.clear();
		}

		contentElement
			.querySelectorAll<HTMLButtonElement>('button[data-post-detail-toggle][aria-controls]')
			.forEach((toggleButton) => {
				const toggleId = toggleButton.getAttribute('aria-controls');
				if (toggleId !== null) {
					setToggleExpanded(toggleButton, expandedToggleIdsRef.current.has(toggleId));
				}
			});
	});

	useEffect(() => {
		const trackerKey = getTrackerKey(postId);
		retainTrackerKey(trackerKey);

		if (!viewedTrackerKeys.has(trackerKey)) {
			viewedTrackerKeys.add(trackerKey);

			const entryContext = consumePostDetailEntryContext(postId);
			analytics.postDetailViewed({
				postId,
				ownerType,
				category,
				entrySource: entryContext?.entrySource ?? 'direct',
				feedPosition: entryContext?.feedPosition ?? null,
			});
		}

		return () => {
			releaseTrackerKey(trackerKey);
		};
	}, [category, ownerType, postId]);

	useEffect(() => {
		const trackerKey = getTrackerKey(postId);

		const trackReadEngagement = () => {
			if (engagedTrackerKeys.has(trackerKey)) {
				return;
			}

			const articleElement = contentRef.current;
			if (articleElement === null) {
				return;
			}

			if (getArticleScrollDepth(articleElement) < READ_ENGAGED_SCROLL_DEPTH_THRESHOLD) {
				return;
			}

			engagedTrackerKeys.add(trackerKey);
			analytics.postReadEngaged({
				postId,
				engagementSeconds: Math.floor(getActiveEngagementTime() / 1_000),
				scrollDepthBucket: READ_ENGAGED_SCROLL_DEPTH_BUCKET,
			});
		};

		trackReadEngagement();
		window.addEventListener('scroll', trackReadEngagement, { passive: true });
		window.addEventListener('resize', trackReadEngagement);

		return () => {
			window.removeEventListener('scroll', trackReadEngagement);
			window.removeEventListener('resize', trackReadEngagement);
		};
	}, [getActiveEngagementTime, postId]);

	const handleToggleClick = (event: MouseEvent<HTMLElement>) => {
		const toggleButton = getToggleButton(event.target);
		if (toggleButton === null || !event.currentTarget.contains(toggleButton)) {
			return;
		}

		const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
		const nextExpanded = !isExpanded;
		const toggleId = toggleButton.getAttribute('aria-controls');
		if (toggleId !== null) {
			if (nextExpanded) {
				expandedToggleIdsRef.current.add(toggleId);
			} else {
				expandedToggleIdsRef.current.delete(toggleId);
			}
		}

		setToggleExpanded(toggleButton, nextExpanded);
	};

	return (
		<article
			ref={contentRef}
			className="post-detail-body bn-root bn-container"
			data-post-detail-content=""
			aria-label="게시글 본문"
			onClick={handleToggleClick}
		>
			<div className="bn-editor bn-default-styles" dangerouslySetInnerHTML={{ __html: html }} />
		</article>
	);
}
