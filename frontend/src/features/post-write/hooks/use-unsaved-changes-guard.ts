import { useCallback, useEffect, useRef } from 'react';

// 작성 페이지가 추가한 history entry를 기존 history state와 구분하기 위한 key
const HISTORY_GUARD_KEY = '__rilogWriteGuard';

interface UseUnsavedChangesGuardOptions {
	isDirty: boolean;
	onNavigationAttempt: () => void;
	onNavigate: (href: string) => void;
}

interface UseUnsavedChangesGuardResult {
	cancelPendingNavigation: () => void;
	continuePendingNavigation: () => Promise<void>;
	releaseGuardEntry: () => Promise<void>;
}

type PendingNavigation = { kind: 'history' } | { kind: 'link'; href: string };

const getCurrentHistoryState = (): Record<string, unknown> => {
	// Next.js가 저장한 history state를 유지하면서 guard 표시만 추가할 수 있도록 객체 형태로 복사
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
	onNavigate,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult => {
	// 현재 문서에 guard용 history entry가 추가되어 있는지 추적
	const isGuardEntryActiveRef = useRef(false);
	// 사용자가 나가기를 확정했거나 발행이 완료된 경우 다음 popstate를 확인 없이 통과시키기 위한 flag
	const isBypassingHistoryRef = useRef(false);
	// history와 내부 링크 중 사용자가 확인한 뒤 이어서 수행할 이동을 보관
	const pendingNavigationRef = useRef<PendingNavigation | null>(null);

	// 현재 URL에 guard용 history entry를 한 번만 추가해 browser back을 가로챌 수 있게 함
	const pushGuardEntry = useCallback(() => {
		if (isGuardEntryActiveRef.current) {
			return;
		}

		window.history.pushState({ ...getCurrentHistoryState(), [HISTORY_GUARD_KEY]: true }, '', window.location.href);
		isGuardEntryActiveRef.current = true;
	}, []);

	// 작성 내용이 처음 변경되는 시점에 이탈 방지용 history entry 추가
	useEffect(() => {
		if (isDirty) {
			pushGuardEntry();
		}
	}, [isDirty, pushGuardEntry]);

	// browser back으로 guard entry를 벗어나려 할 때 페이지 이동 대신 이탈 확인 UI를 요청
	useEffect(() => {
		const handlePopState = () => {
			// 사용자가 이동을 확정한 경우에는 현재 popstate를 소비하고 추가 확인을 생략
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

	// 같은 origin의 일반 링크는 목적지를 저장하고 이탈 확인 UI를 거친 뒤 이동
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

	// 작성 중 새로고침이나 탭 닫기에는 브라우저 기본 이탈 경고 사용
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

	// 발행 완료 후 guard entry를 제거한 다음 실제 게시글 상세 페이지 이동을 허용
	const releaseGuardEntry = useCallback(async () => {
		if (!isGuardEntryActiveRef.current) {
			return;
		}

		await new Promise<void>((resolve) => {
			let isSettled = false;
			const releaseState = { fallbackTimer: undefined as number | undefined };

			// popstate 발생 여부와 무관하게 cleanup과 resolve를 한 번만 수행
			const handleReleased = () => {
				if (isSettled) {
					return;
				}

				isSettled = true;
				if (releaseState.fallbackTimer !== undefined) {
					window.clearTimeout(releaseState.fallbackTimer);
				}
				window.removeEventListener('popstate', handleReleased);
				isGuardEntryActiveRef.current = false;
				isBypassingHistoryRef.current = false;
				resolve();
			};

			isBypassingHistoryRef.current = true;
			window.addEventListener('popstate', handleReleased, { once: true });
			window.history.back();
			// 브라우저가 popstate를 전달하지 않는 경우에도 발행 후 이동이 멈추지 않도록 fallback 처리
			releaseState.fallbackTimer = window.setTimeout(handleReleased, 100);
		});
	}, []);

	// 사용자가 계속 작성을 선택하면 소비된 history guard를 복구하고 보류 중인 링크 이동을 취소
	const cancelPendingNavigation = useCallback(() => {
		if (pendingNavigationRef.current?.kind === 'history') {
			pushGuardEntry();
		}
		pendingNavigationRef.current = null;
	}, [pushGuardEntry]);

	// 사용자가 나가기를 확정하면 보류한 history 또는 내부 링크 이동을 guard 없이 진행
	const continuePendingNavigation = useCallback(async () => {
		const pendingNavigation = pendingNavigationRef.current;
		pendingNavigationRef.current = null;

		if (pendingNavigation?.kind === 'history') {
			isBypassingHistoryRef.current = true;
			window.history.back();
			return;
		}

		if (pendingNavigation?.kind === 'link') {
			await releaseGuardEntry();
			onNavigate(pendingNavigation.href);
		}
	}, [onNavigate, releaseGuardEntry]);

	return { cancelPendingNavigation, continuePendingNavigation, releaseGuardEntry };
};
