export const POST_FEED_SCROLL_TARGET_ID = 'post-feed-start';

const FILTER_SCROLL_DURATION_MS = 500;
const SCROLL_CANCEL_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'popstate', 'pagehide'] as const;

const easeInOutCubic = (progress: number): number =>
	progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;

let animationFrameId: number | null = null;

const removeScrollCancelListeners = () => {
	SCROLL_CANCEL_EVENTS.forEach((eventName) => window.removeEventListener(eventName, cancelFeedFilterScroll));
};

export const cancelFeedFilterScroll = () => {
	if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
	animationFrameId = null;
	removeScrollCancelListeners();
};

export const navigateFeedFilter = (href: string) => {
	cancelFeedFilterScroll();
	window.history.pushState(null, '', href);
	const target = document.getElementById(POST_FEED_SCROLL_TARGET_ID);
	if (target === null) return;

	const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
	const targetScrollY = Math.max(0, window.scrollY + target.getBoundingClientRect().top - scrollMarginTop);
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
		window.scrollTo({ top: targetScrollY, behavior: 'auto' });
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
	};

	SCROLL_CANCEL_EVENTS.forEach((eventName) =>
		window.addEventListener(eventName, cancelFeedFilterScroll, { passive: true }),
	);
	animationFrameId = window.requestAnimationFrame(animateScroll);
};
