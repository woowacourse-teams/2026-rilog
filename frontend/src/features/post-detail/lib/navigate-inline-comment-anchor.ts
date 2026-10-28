const HOLD_DURATION_MS = 1000;
const FADE_DURATION_MS = 500;

// The existing line overlays identify the quote without changing the native text selection.
export function navigateInlineCommentAnchor(
	target: HTMLElement,
	getHighlights: () => readonly HTMLElement[],
): () => void {
	const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
	let frame = 0;
	let timer: number | undefined;
	let canceled = false;
	const markedLines = new Set<HTMLElement>();
	const cancel = () => {
		canceled = true;
		window.cancelAnimationFrame(frame);
		if (timer !== undefined) window.clearTimeout(timer);
		markedLines.forEach((line) => {
			delete line.dataset.inlineCommentNavigation;
			line.style.removeProperty('--inline-comment-navigation-delay');
		});
		markedLines.clear();
	};
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
		window.scrollTo({
			top: Math.max(0, window.scrollY + quote.top - destination),
			behavior: reducedMotion ? 'instant' : 'smooth',
		});
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
		if (stableFrames >= 3 && bounds.bottom > visible.top && bounds.top < visible.bottom) {
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
		}
	};
	frame = window.requestAnimationFrame(waitForArrival);
	return cancel;
}
