import { useEffect, useRef, useState } from 'react';

import {
	cancelFeedFilterScroll,
	FEED_FILTER_SCROLL_CHANGE_EVENT,
	POST_FEED_SCROLL_TARGET_ID,
} from '@/features/post-feed/lib/navigate-feed-filter';

const SCROLL_UP_REVEAL_THRESHOLD_PX = 24;

export function usePostFeedHeaderScroll() {
	const headerRef = useRef<HTMLElement>(null);
	const previousScrollYRef = useRef(0);
	const upwardScrollDistanceRef = useRef(0);
	const hasUserInteractedRef = useRef(false);
	const isFilterScrollingRef = useRef(false);

	const [isHidden, setIsHidden] = useState(false);
	const [isFilterScrolling, setIsFilterScrolling] = useState(false);

	useEffect(() => {
		previousScrollYRef.current = window.scrollY;
		const scrollTarget = document.getElementById(POST_FEED_SCROLL_TARGET_ID);

		const markUserInteracted = () => {
			hasUserInteractedRef.current = true;
		};

		const handleFilterScrollChange = (event: Event) => {
			const isScrolling = (event as CustomEvent<boolean>).detail;

			isFilterScrollingRef.current = isScrolling;
			setIsFilterScrolling(isScrolling);

			if (isScrolling) {
				upwardScrollDistanceRef.current = 0;
				setIsHidden(false);
			}
		};

		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const previousScrollY = previousScrollYRef.current;
			previousScrollYRef.current = currentScrollY;

			if (isFilterScrollingRef.current) return;

			if (currentScrollY <= 0 || !hasUserInteractedRef.current) {
				upwardScrollDistanceRef.current = 0;
				setIsHidden(false);
				return;
			}

			if (currentScrollY < previousScrollY) {
				upwardScrollDistanceRef.current += previousScrollY - currentScrollY;

				if (upwardScrollDistanceRef.current >= SCROLL_UP_REVEAL_THRESHOLD_PX) {
					upwardScrollDistanceRef.current = 0;
					setIsHidden(false);
				}
				return;
			}

			if (currentScrollY > previousScrollY) {
				upwardScrollDistanceRef.current = 0;
			}

			const header = headerRef.current;
			if (header === null || currentScrollY === previousScrollY) {
				return;
			}

			const stickyTop = Number.parseFloat(window.getComputedStyle(header).top) || 0;
			if (header.getBoundingClientRect().top <= stickyTop + 1) {
				setIsHidden(scrollTarget === null || scrollTarget.getBoundingClientRect().top < stickyTop - 1);
			}
		};

		window.addEventListener('pointerdown', markUserInteracted, { passive: true });
		window.addEventListener('touchstart', markUserInteracted, { passive: true });
		window.addEventListener('wheel', markUserInteracted, { passive: true });
		window.addEventListener('keydown', markUserInteracted);
		window.addEventListener(FEED_FILTER_SCROLL_CHANGE_EVENT, handleFilterScrollChange);
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener(FEED_FILTER_SCROLL_CHANGE_EVENT, handleFilterScrollChange);
			cancelFeedFilterScroll();
			window.removeEventListener('pointerdown', markUserInteracted);
			window.removeEventListener('touchstart', markUserInteracted);
			window.removeEventListener('wheel', markUserInteracted);
			window.removeEventListener('keydown', markUserInteracted);
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return { headerRef, isHidden, isFilterScrolling };
}
