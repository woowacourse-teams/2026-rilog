'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CommentView = 'closed' | 'comments';

const HISTORY_KEY = '__rilogCommentView';

const getHistoryState = (): object => {
	const state: unknown = window.history.state;
	return typeof state === 'object' && state !== null ? state : {};
};

const readView = (postId: number): CommentView => {
	const state = getHistoryState();
	const value: unknown = HISTORY_KEY in state ? state[HISTORY_KEY] : null;
	if (
		typeof value !== 'object' ||
		value === null ||
		!('postId' in value) ||
		value.postId !== postId ||
		!('pathname' in value) ||
		value.pathname !== window.location.pathname ||
		!('view' in value)
	)
		return 'closed';
	return value.view === 'comments' ? value.view : 'closed';
};

const detailUrl = () => {
	const url = new URL(window.location.href);
	url.searchParams.delete('selectionId');
	url.searchParams.delete('notificationCommentDeleted');
	return `${url.pathname}${url.search}${url.hash}`;
};

// Only this workspace's transient entry is consumed. Preserve Next's history state.
export function useCommentHistory(postId: number, initiallyOpen: boolean) {
	const [view, setView] = useState<CommentView>(initiallyOpen ? 'comments' : 'closed');
	const initialized = useRef(false);
	const isClosing = useRef(false);
	const queuedView = useRef<Exclude<CommentView, 'closed'> | null>(null);

	const writeView = useCallback(
		(next: Exclude<CommentView, 'closed'>) => {
			const state = {
				...getHistoryState(),
				[HISTORY_KEY]: { postId, pathname: window.location.pathname, view: next },
			};
			if (readView(postId) === 'closed') window.history.pushState(state, '', window.location.href);
			else window.history.replaceState(state, '', window.location.href);
			setView(next);
		},
		[postId],
	);

	useEffect(() => {
		if (!initialized.current) {
			initialized.current = true;
			const restored = readView(postId);
			if (restored !== 'closed') queueMicrotask(() => setView(restored));
			else if (initiallyOpen) {
				const linkedUrl = window.location.href;
				window.history.replaceState(window.history.state, '', detailUrl());
				window.history.pushState(
					{
						...getHistoryState(),
						[HISTORY_KEY]: { postId, pathname: window.location.pathname, view: 'comments' },
					},
					'',
					linkedUrl,
				);
			}
		}
		const onPopState = () => {
			isClosing.current = false;
			const queued = queuedView.current;
			queuedView.current = null;
			if (queued !== null) writeView(queued);
			else setView(readView(postId));
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [initiallyOpen, postId, writeView]);

	const open = useCallback(
		(next: Exclude<CommentView, 'closed'>) => {
			if (isClosing.current) queuedView.current = next;
			else writeView(next);
		},
		[writeView],
	);

	const close = useCallback(() => {
		setView('closed');
		if (isClosing.current) return;
		if (readView(postId) !== 'closed') {
			isClosing.current = true;
			window.history.back();
		}
	}, [postId]);

	return { view, open, close };
}
