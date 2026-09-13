export const POST_FEED_SCROLL_TARGET_ID = 'post-feed-start';
export const FEED_FILTER_SCROLL_CHANGE_EVENT = 'feed-filter-scroll-change';

const FILTER_SCROLL_DURATION_MS = 500;
const SCROLL_CANCEL_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'popstate', 'pagehide'] as const;

const easeInOutCubic = (progress: number): number =>
	progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

let animationFrameId: number | null = null;
let isFilterScrolling = false;

const setFilterScrolling = (isScrolling: boolean) => {
	if (isFilterScrolling === isScrolling) return;
	isFilterScrolling = isScrolling;
	window.dispatchEvent(new CustomEvent(FEED_FILTER_SCROLL_CHANGE_EVENT, { detail: isScrolling }));
};

const removeScrollCancelListeners = () => {
	SCROLL_CANCEL_EVENTS.forEach((eventName) => window.removeEventListener(eventName, cancelFeedFilterScroll));
};

export const cancelFeedFilterScroll = () => {
	if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
	animationFrameId = null;
	removeScrollCancelListeners();
	setFilterScrolling(false);
};

export const navigateFeedFilter = (href: string) => {
	cancelFeedFilterScroll();
	window.history.pushState(null, '', href);
	const target = document.getElementById(POST_FEED_SCROLL_TARGET_ID);
	if (target === null) return;

	const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
	const targetScrollY = Math.max(0, window.scrollY + target.getBoundingClientRect().top - scrollMarginTop);
	setFilterScrolling(true);
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
		window.scrollTo({ top: targetScrollY, behavior: 'auto' });
		setFilterScrolling(false);
		return;
	}

	const startScrollY = window.scrollY;
	const distance = targetScrollY - startScrollY;
	let startedAt: number | null = null;
	const animateScroll = (timestamp: number) => {
		startedAt ??= timestamp;
		const progress = Math.min((timestamp - startedAt) / FILTER_SCROLL_DURATION_MS, 1);
		window.scrollTo({ top: startScrollY + distance * easeInOutCubic(progress), behavior: 'auto' });
		if (progress < 1) {
			animationFrameId = window.requestAnimationFrame(animateScroll);
			return;
		}

		animationFrameId = null;
		removeScrollCancelListeners();
		setFilterScrolling(false);
	};

	SCROLL_CANCEL_EVENTS.forEach((eventName) =>
		window.addEventListener(eventName, cancelFeedFilterScroll, { passive: true }),
	);
	animationFrameId = window.requestAnimationFrame(animateScroll);
};
