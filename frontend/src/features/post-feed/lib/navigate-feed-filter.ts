export const navigateFeedFilter = (href: string) => {
	window.history.pushState(null, '', href);
	const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
	window.scrollTo({ top: 0, behavior });
};
