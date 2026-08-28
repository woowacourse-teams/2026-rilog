'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { MouseEvent } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { consumePostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { analytics } from '@/features/analytics/model/events';
import { useActiveElapsedTime } from '@/shared/hooks/use-active-elapsed-time';
import MermaidCodeBlockPreviewController from '@/shared/ui/mermaid-diagram/MermaidCodeBlockPreviewController';

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
	const [contentElement, setContentElement] = useState<HTMLElement | null>(null);
	const currentPostIdRef = useRef(postId);
	const expandedToggleIdsRef = useRef(new Set<string>());
	const getActiveEngagementTime = useActiveElapsedTime(postId);
	const setContentRef = useCallback((element: HTMLElement | null) => {
		contentRef.current = element;
		setContentElement(element);
	}, []);

	useLayoutEffect(() => {
		const articleElement = contentRef.current;
		if (articleElement === null) {
			return;
		}

		if (currentPostIdRef.current !== postId) {
			currentPostIdRef.current = postId;
			expandedToggleIdsRef.current.clear();
		}

		articleElement
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
			ref={setContentRef}
			className="post-detail-body bn-root bn-container"
			data-post-detail-content=""
			aria-label="게시글 본문"
			onClick={handleToggleClick}
		>
			<div className="bn-editor bn-default-styles" dangerouslySetInnerHTML={{ __html: html }} />
			<MermaidCodeBlockPreviewController container={contentElement} label="Mermaid 다이어그램" />
		</article>
	);
}
