const HOLD_DURATION_MS = 1000;
const FADE_DURATION_MS = 500;
const SCROLL_DURATION_MS = 360;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
const activeNavigations = new WeakMap<Window, () => void>();

// The existing line overlays identify the quote without changing the native text selection.
export function navigateInlineCommentAnchor(
	target: HTMLElement,
	getHighlights: () => readonly HTMLElement[],
): () => void {
	activeNavigations.get(window)?.();
	const pathname = window.location.pathname;
	const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	let frame = 0;
	let timer: number | undefined;
	let canceled = false;
	let scrollFrame = 0;
	let ownsScroll = false;
	const markedLines = new Set<HTMLElement>();
	const releaseScroll = () => {
		if (!ownsScroll) return;
		ownsScroll = false;
		window.cancelAnimationFrame(scrollFrame);
		window.removeEventListener('wheel', releaseScroll, true);
		window.removeEventListener('touchstart', releaseScroll, true);
		window.removeEventListener('touchmove', releaseScroll, true);
		window.removeEventListener('pointerdown', releaseScroll, true);
		window.removeEventListener('keydown', releaseScrollOnKey, true);
		window.removeEventListener('pagehide', cancel);
		document.removeEventListener('visibilitychange', cancelWhenHidden);
	};
	const releaseScrollOnKey = (event: KeyboardEvent) => {
		if (SCROLL_KEYS.has(event.key)) releaseScroll();
	};
	const cancel = () => {
		if (canceled) return;
		canceled = true;
		window.cancelAnimationFrame(frame);
		if (timer !== undefined) window.clearTimeout(timer);
		releaseScroll();
		markedLines.forEach((line) => {
			delete line.dataset.inlineCommentNavigation;
			line.style.removeProperty('--inline-comment-navigation-delay');
		});
		markedLines.clear();
		if (activeNavigations.get(window) === cancel) activeNavigations.delete(window);
	};
	const cancelWhenHidden = () => {
		if (document.visibilityState === 'hidden') cancel();
	};
	activeNavigations.set(window, cancel);
	const getViewport = () => {
		const viewport = window.visualViewport;
		const top = Math.max(
			viewport?.offsetTop ?? 0,
			document.querySelector('[data-mobile-header]')?.getBoundingClientRect().bottom ?? 0,
		);
		return { top, bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) };
	};
	const getQuoteBounds = () => {
		const highlights = getHighlights();
		if (highlights.length === 0) return target.getBoundingClientRect();
		const rects = highlights.map((line) => {
			const rect = line.getBoundingClientRect();
			const height = Number.parseFloat(line.style.getPropertyValue('--inline-comment-highlight-expanded-height'));
			return { top: rect.bottom - (height || rect.height), bottom: rect.bottom };
		});
		return { top: Math.min(...rects.map((rect) => rect.top)), bottom: Math.max(...rects.map((rect) => rect.bottom)) };
	};
	const viewport = getViewport();
	const quote = getQuoteBounds();
	if (quote.top < viewport.top + 16 || quote.bottom > viewport.bottom - 16) {
		const availableHeight = viewport.bottom - viewport.top;
		const quoteHeight = Math.min(quote.bottom - quote.top, availableHeight);
		const destination = viewport.top + (availableHeight - quoteHeight) * 0.38;
		const targetY = Math.max(0, window.scrollY + quote.top - destination);
		const root = document.scrollingElement;
		const reachableY = root ? Math.min(targetY, Math.max(0, root.scrollHeight - root.clientHeight)) : targetY;
		if (reducedMotion) {
			window.scrollTo({ top: reachableY, behavior: 'instant' });
		} else if (Math.abs(reachableY - window.scrollY) > 0.5 && document.visibilityState !== 'hidden') {
			const startY = window.scrollY;
			const scrollStartedAt = performance.now();
			ownsScroll = true;
			window.addEventListener('wheel', releaseScroll, { capture: true, passive: true });
			window.addEventListener('touchstart', releaseScroll, { capture: true, passive: true });
			window.addEventListener('touchmove', releaseScroll, { capture: true, passive: true });
			window.addEventListener('pointerdown', releaseScroll, { capture: true, passive: true });
			window.addEventListener('keydown', releaseScrollOnKey, true);
			window.addEventListener('pagehide', cancel);
			document.addEventListener('visibilitychange', cancelWhenHidden);
			const animateScroll = (now: number) => {
				if (!ownsScroll) return;
				if (!target.isConnected || window.location.pathname !== pathname) {
					cancel();
					return;
				}
				const progress = Math.min(1, Math.max(0, (now - scrollStartedAt) / SCROLL_DURATION_MS));
				const eased = 1 - (1 - progress) ** 3;
				window.scrollTo({ top: startY + (reachableY - startY) * eased, behavior: 'instant' });
				if (progress < 1) scrollFrame = window.requestAnimationFrame(animateScroll);
				else releaseScroll();
			};
			scrollFrame = window.requestAnimationFrame(animateScroll);
		}
	}

	const startedAt = performance.now();
	let previousPosition: string | undefined;
	let stableFrames = 0;
	const waitForArrival = () => {
		if (canceled || !target.isConnected) {
			cancel();
			return;
		}
		const visible = getViewport();
		const bounds = getQuoteBounds();
		// Include keyboard viewport movement: a settled document alone does not imply a visible destination.
		const position = [window.scrollY, visible.top, visible.bottom, bounds.top].map(Math.round).join(':');
		stableFrames = position === previousPosition ? stableFrames + 1 : 0;
		previousPosition = position;
		if (!ownsScroll && stableFrames >= 3 && bounds.bottom > visible.top && bounds.top < visible.bottom) {
			const emphasizedAt = performance.now();
			const duration = HOLD_DURATION_MS + (reducedMotion ? 0 : FADE_DURATION_MS);
			const paintHighlights = () => {
				if (canceled || !target.isConnected) {
					cancel();
					return;
				}
				const elapsed = performance.now() - emphasizedAt;
				if (elapsed >= duration) {
					cancel();
					return;
				}
				// Resize/font updates replace overlays; new lines continue the same feedback window.
				getHighlights().forEach((line) => {
					if (markedLines.has(line)) return;
					markedLines.add(line);
					line.style.setProperty('--inline-comment-navigation-delay', `${-elapsed}ms`);
					line.dataset.inlineCommentNavigation = '';
				});
				frame = window.requestAnimationFrame(paintHighlights);
			};
			timer = window.setTimeout(cancel, duration);
			paintHighlights();
		} else if (performance.now() - startedAt < 2000) {
			frame = window.requestAnimationFrame(waitForArrival);
		} else cancel();
	};
	frame = window.requestAnimationFrame(waitForArrival);
	return cancel;
}
