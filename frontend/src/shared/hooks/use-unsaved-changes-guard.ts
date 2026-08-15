import { useCallback, useEffect, useRef } from 'react';

const HISTORY_GUARD_KEY = '__rilogUnsavedChangesGuard';

interface UseUnsavedChangesGuardOptions {
	isDirty: boolean;
	onNavigationAttempt: () => void;
	onReplace: (href: string) => void;
}

interface UseUnsavedChangesGuardResult {
	cancelPendingNavigation: () => void;
	continuePendingNavigation: () => void;
	clearGuardEntry: () => void;
}

type PendingNavigation = { kind: 'history' } | { kind: 'link'; href: string };

const getCurrentHistoryState = (): Record<string, unknown> => {
	const state: unknown = window.history.state;
	return typeof state === 'object' && state !== null ? { ...state } : {};
};

const getInternalNavigationHref = (event: MouseEvent): string | null => {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return null;
	}

	const target = event.target;
	const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null;
	if (anchor === null || anchor.hasAttribute('download') || (anchor.target !== '' && anchor.target !== '_self')) {
		return null;
	}

	const url = new URL(anchor.href, window.location.href);
	if (url.origin !== window.location.origin || url.href === window.location.href) {
		return null;
	}

	return `${url.pathname}${url.search}${url.hash}`;
};

export const useUnsavedChangesGuard = ({
	isDirty,
	onNavigationAttempt,
	onReplace,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult => {
	const isGuardEntryActiveRef = useRef(false);
	const isBypassingHistoryRef = useRef(false);
	const pendingNavigationRef = useRef<PendingNavigation | null>(null);

	const pushGuardEntry = useCallback(() => {
		if (isGuardEntryActiveRef.current) {
			return;
		}

		window.history.pushState({ ...getCurrentHistoryState(), [HISTORY_GUARD_KEY]: true }, '', window.location.href);
		isGuardEntryActiveRef.current = true;
	}, []);

	useEffect(() => {
		if (isDirty) {
			pushGuardEntry();
		}
	}, [isDirty, pushGuardEntry]);

	useEffect(() => {
		const handlePopState = () => {
			if (isBypassingHistoryRef.current) {
				isBypassingHistoryRef.current = false;
				return;
			}

			if (isGuardEntryActiveRef.current && pendingNavigationRef.current === null) {
				isGuardEntryActiveRef.current = false;
				pendingNavigationRef.current = { kind: 'history' };
				onNavigationAttempt();
			}
		};

		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [onNavigationAttempt]);

	useEffect(() => {
		if (!isDirty) {
			return;
		}

		const handleDocumentClick = (event: MouseEvent) => {
			const href = getInternalNavigationHref(event);
			if (href === null) {
				return;
			}

			event.preventDefault();
			if (pendingNavigationRef.current !== null) {
				return;
			}

			pendingNavigationRef.current = { kind: 'link', href };
			onNavigationAttempt();
		};

		document.addEventListener('click', handleDocumentClick, true);
		return () => document.removeEventListener('click', handleDocumentClick, true);
	}, [isDirty, onNavigationAttempt]);

	useEffect(() => {
		if (!isDirty) {
			return;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [isDirty]);

	const clearGuardEntry = useCallback(() => {
		if (!isGuardEntryActiveRef.current) {
			return;
		}

		const currentState = getCurrentHistoryState();
		Reflect.deleteProperty(currentState, HISTORY_GUARD_KEY);
		window.history.replaceState(currentState, '', window.location.href);
		isGuardEntryActiveRef.current = false;
		isBypassingHistoryRef.current = false;
	}, []);

	const cancelPendingNavigation = useCallback(() => {
		if (pendingNavigationRef.current?.kind === 'history') {
			pushGuardEntry();
		}
		pendingNavigationRef.current = null;
	}, [pushGuardEntry]);

	const continuePendingNavigation = useCallback(() => {
		const pendingNavigation = pendingNavigationRef.current;
		pendingNavigationRef.current = null;

		if (pendingNavigation?.kind === 'history') {
			isBypassingHistoryRef.current = true;
			window.history.back();
			return;
		}

		if (pendingNavigation?.kind === 'link') {
			clearGuardEntry();
			onReplace(pendingNavigation.href);
		}
	}, [clearGuardEntry, onReplace]);

	return { cancelPendingNavigation, continuePendingNavigation, clearGuardEntry };
};
