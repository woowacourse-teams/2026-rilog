import { useEffect, useRef } from 'react';

interface UsePostFeedEntryAutoScrollOptions {
	isReady: boolean;
	targetId: string;
}

const AUTO_SCROLL_DELAY_MS = 350;
const AUTO_SCROLL_DURATION_MS = 1000;

const easeInOutCubic = (progress: number): number =>
	progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

export const usePostFeedEntryAutoScroll = ({ isReady, targetId }: UsePostFeedEntryAutoScrollOptions) => {
	const hasUserInteractedRef = useRef(false);
	const timeoutIdRef = useRef<number | null>(null);
	const animationFrameIdRef = useRef<number | null>(null);

	useEffect(() => {
		const clearScheduledScroll = () => {
			if (timeoutIdRef.current !== null) {
				window.clearTimeout(timeoutIdRef.current);
				timeoutIdRef.current = null;
			}

			if (animationFrameIdRef.current !== null) {
				window.cancelAnimationFrame(animationFrameIdRef.current);
				animationFrameIdRef.current = null;
			}
		};

		const cancelOnUserInteraction = () => {
			hasUserInteractedRef.current = true;
			clearScheduledScroll();
		};

		const passiveListenerOptions: AddEventListenerOptions = { passive: true };
		const previousScrollRestoration = window.history.scrollRestoration;
		window.history.scrollRestoration = 'manual';

		window.addEventListener('pointerdown', cancelOnUserInteraction, passiveListenerOptions);
		window.addEventListener('touchstart', cancelOnUserInteraction, passiveListenerOptions);
		window.addEventListener('wheel', cancelOnUserInteraction, passiveListenerOptions);
		window.addEventListener('keydown', cancelOnUserInteraction);

		return () => {
			clearScheduledScroll();
			window.history.scrollRestoration = previousScrollRestoration;
			window.removeEventListener('pointerdown', cancelOnUserInteraction);
			window.removeEventListener('touchstart', cancelOnUserInteraction);
			window.removeEventListener('wheel', cancelOnUserInteraction);
			window.removeEventListener('keydown', cancelOnUserInteraction);
		};
	}, []);

	useEffect(() => {
		if (!isReady || hasUserInteractedRef.current) {
			return;
		}

		timeoutIdRef.current = window.setTimeout(() => {
			const target = document.getElementById(targetId);

			if (target === null || hasUserInteractedRef.current) {
				return;
			}

			const startScrollY = window.scrollY;
			const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
			const targetScrollY = Math.max(0, startScrollY + target.getBoundingClientRect().top - scrollMarginTop);
			const distance = targetScrollY - startScrollY;

			if (Math.abs(distance) < 1) {
				return;
			}

			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
				window.scrollTo({ top: targetScrollY, behavior: 'auto' });
				return;
			}

			let startedAt: number | null = null;
			const animateScroll = (timestamp: number) => {
				if (hasUserInteractedRef.current) {
					return;
				}

				startedAt ??= timestamp;
				const progress = Math.min((timestamp - startedAt) / AUTO_SCROLL_DURATION_MS, 1);
				window.scrollTo({ top: startScrollY + distance * easeInOutCubic(progress), behavior: 'auto' });

				if (progress < 1) {
					animationFrameIdRef.current = window.requestAnimationFrame(animateScroll);
					return;
				}

				animationFrameIdRef.current = null;
			};

			animationFrameIdRef.current = window.requestAnimationFrame(animateScroll);
		}, AUTO_SCROLL_DELAY_MS);

		return () => {
			if (timeoutIdRef.current !== null) {
				window.clearTimeout(timeoutIdRef.current);
				timeoutIdRef.current = null;
			}

			if (animationFrameIdRef.current !== null) {
				window.cancelAnimationFrame(animationFrameIdRef.current);
				animationFrameIdRef.current = null;
			}
		};
	}, [isReady, targetId]);
};
