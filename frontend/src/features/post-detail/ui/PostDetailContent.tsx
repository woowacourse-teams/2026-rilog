'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { InlineCommentOpenRequest, InlineCommentSelectionTarget } from '../model/inline-comment-interaction';
import type { MouseEvent } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { consumePostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { analytics } from '@/features/analytics/model/events';
import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import { useActiveElapsedTime } from '@/shared/hooks/use-active-elapsed-time';
import MermaidCodeBlockPreviewController from '@/shared/ui/mermaid-diagram/MermaidCodeBlockPreviewController';
import { logNonProductionInfo } from '@/shared/utils/non-production-console';

import InlineCommentHighlights from './InlineCommentHighlights';
import InlineCommentSelectionToolbar from './InlineCommentSelectionToolbar';

interface PostDetailContentProps {
	html: string;
	postId: number;
	ownerType: BlogType;
	category: PostCategory;
	inlineCommentBlocks?: readonly InlineCommentBlockModel[];
	enableInlineCommentSelectionDebug?: boolean;
	onInlineCommentOpen?: (request: InlineCommentOpenRequest) => void;
	onInlineCommentCreate?: (selection: InlineCommentSelectionTarget) => void;
}

const EMPTY_INLINE_COMMENT_BLOCKS: readonly InlineCommentBlockModel[] = [];

const trackerMountCounts = new Map<string, number>();
const trackerCleanupTimers = new Map<string, number>();
const viewedTrackerKeys = new Set<string>();
const engagedTrackerKeys = new Set<string>();
const READING_PROGRESS_INTERVAL_MS = 10_000;
const READ_ENGAGED_SCROLL_DEPTH_THRESHOLD = 0.5;
const READ_ENGAGED_SCROLL_DEPTH_BUCKET = '50_percent';

interface ReadingVisit {
	key: string;
	postId: number;
	id: string;
	hasReached50Percent: boolean;
	lastSent: { elapsedMs: number; hasReached50Percent: boolean } | null;
	pendingExitTimer: number | null;
}

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

export default function PostDetailContent({
	html,
	postId,
	ownerType,
	category,
	inlineCommentBlocks = EMPTY_INLINE_COMMENT_BLOCKS,
	enableInlineCommentSelectionDebug = false,
	onInlineCommentOpen,
	onInlineCommentCreate,
}: PostDetailContentProps) {
	const contentRef = useRef<HTMLElement>(null);
	const [contentElement, setContentElement] = useState<HTMLElement | null>(null);
	const [visitEpoch, setVisitEpoch] = useState(0);
	const currentPostIdRef = useRef(postId);
	const expandedToggleIdsRef = useRef(new Set<string>());
	const readingVisitRef = useRef<ReadingVisit | null>(null);
	const didPageHideRef = useRef(false);
	const getReadingVisit = useCallback(() => {
		const key = `${postId}:${visitEpoch}`;
		if (readingVisitRef.current?.key !== key) {
			readingVisitRef.current = {
				key,
				postId,
				id: window.crypto.randomUUID(),
				hasReached50Percent: false,
				lastSent: null,
				pendingExitTimer: null,
			};
		}
		return readingVisitRef.current;
	}, [postId, visitEpoch]);
	const sendReadingProgress = useCallback((visit: ReadingVisit, elapsedMs: number, useBeacon = false) => {
		const hasReached50Percent = visit.hasReached50Percent;
		if (visit.lastSent?.elapsedMs === elapsedMs && visit.lastSent.hasReached50Percent === hasReached50Percent) {
			return;
		}

		visit.lastSent = { elapsedMs, hasReached50Percent };
		const properties = {
			postId: visit.postId,
			readingVisitId: visit.id,
			engagementSeconds: elapsedMs / 1_000,
			hasReached50Percent,
		};
		if (useBeacon) {
			analytics.postReadingProgress(properties, true);
		} else {
			analytics.postReadingProgress(properties);
		}
	}, []);
	const handleReadingInterval = useCallback(
		(elapsedMs: number) => sendReadingProgress(getReadingVisit(), elapsedMs),
		[getReadingVisit, sendReadingProgress],
	);
	const getActiveEngagementTime = useActiveElapsedTime(`${postId}:${visitEpoch}`, {
		intervalMs: READING_PROGRESS_INTERVAL_MS,
		onInterval: handleReadingInterval,
	});
	const setContentRef = useCallback((element: HTMLElement | null) => {
		contentRef.current = element;
		setContentElement(element);
	}, []);
	const handleInlineCommentOpen = useCallback(
		(request: InlineCommentOpenRequest) => {
			if (enableInlineCommentSelectionDebug) {
				logNonProductionInfo('[inline-comment] open request', request);
			}
			onInlineCommentOpen?.(request);
		},
		[enableInlineCommentSelectionDebug, onInlineCommentOpen],
	);

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
		const readingVisit = getReadingVisit();
		if (readingVisit.pendingExitTimer !== null) {
			window.clearTimeout(readingVisit.pendingExitTimer);
			readingVisit.pendingExitTimer = null;
		}

		const trackReadEngagement = () => {
			if (document.visibilityState !== 'visible') {
				return;
			}

			const articleElement = contentRef.current;
			if (articleElement !== null && getArticleScrollDepth(articleElement) >= READ_ENGAGED_SCROLL_DEPTH_THRESHOLD) {
				const isFirstDepthReach = !readingVisit.hasReached50Percent;
				readingVisit.hasReached50Percent = true;
				if (!engagedTrackerKeys.has(trackerKey)) {
					engagedTrackerKeys.add(trackerKey);
					analytics.postReadEngaged({
						postId,
						engagementSeconds: Math.floor(getActiveEngagementTime() / 1_000),
						scrollDepthBucket: READ_ENGAGED_SCROLL_DEPTH_BUCKET,
					});
				}
				if (isFirstDepthReach) {
					sendReadingProgress(readingVisit, getActiveEngagementTime());
				}
			}
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				sendReadingProgress(readingVisit, getActiveEngagementTime(), true);
			} else {
				trackReadEngagement();
			}
		};
		const handlePageHide = () => {
			didPageHideRef.current = true;
			sendReadingProgress(readingVisit, getActiveEngagementTime(), true);
		};
		const handlePageShow = () => {
			if (didPageHideRef.current) {
				didPageHideRef.current = false;
				setVisitEpoch((current) => current + 1);
			}
		};

		trackReadEngagement();
		window.addEventListener('scroll', trackReadEngagement, { passive: true });
		window.addEventListener('resize', trackReadEngagement);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('pagehide', handlePageHide);
		window.addEventListener('pageshow', handlePageShow);

		return () => {
			const elapsedMs = getActiveEngagementTime();
			window.removeEventListener('scroll', trackReadEngagement);
			window.removeEventListener('resize', trackReadEngagement);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('pagehide', handlePageHide);
			window.removeEventListener('pageshow', handlePageShow);
			readingVisit.pendingExitTimer = window.setTimeout(() => {
				readingVisit.pendingExitTimer = null;
				sendReadingProgress(readingVisit, elapsedMs);
			}, 0);
		};
	}, [getActiveEngagementTime, getReadingVisit, postId, sendReadingProgress]);

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
			{contentElement === null ? null : (
				<InlineCommentHighlights
					article={contentElement}
					blocks={inlineCommentBlocks}
					contentKey={html}
					onOpenComments={handleInlineCommentOpen}
				/>
			)}
			<MermaidCodeBlockPreviewController container={contentElement} label="Mermaid 다이어그램" />
			{contentElement !== null && onInlineCommentCreate !== undefined && (
				<InlineCommentSelectionToolbar
					key={postId}
					article={contentElement}
					postId={postId}
					onCreateComment={onInlineCommentCreate}
				/>
			)}
		</article>
	);
}
