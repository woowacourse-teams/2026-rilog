import type { BlogProfileEntrySource } from '../model/analytics-event';

const ENTRY_CONTEXT_TTL_MS = 30_000;

interface BlogProfileEntryContext {
	targetPathname: string;
	entrySource: BlogProfileEntrySource;
	recordedAt: number;
}

let entryContext: BlogProfileEntryContext | null = null;

const toPathname = (href: string) => new URL(href, window.location.origin).pathname;

interface SameTabNavigation {
	button: number;
	metaKey: boolean;
	ctrlKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
	currentTarget: { target: string };
}

export const isSameTabBlogProfileNavigation = (event: SameTabNavigation) =>
	event.button === 0 &&
	!event.metaKey &&
	!event.ctrlKey &&
	!event.shiftKey &&
	!event.altKey &&
	event.currentTarget.target !== '_blank';

export const recordBlogProfileEntryContext = ({
	href,
	entrySource,
}: {
	href: string;
	entrySource: BlogProfileEntrySource;
}) => {
	entryContext = {
		targetPathname: toPathname(href),
		entrySource,
		recordedAt: Date.now(),
	};
};

export const consumeBlogProfileEntryContext = (pathname: string): BlogProfileEntrySource | null => {
	const context = entryContext;
	entryContext = null;

	if (
		context !== null &&
		context.targetPathname === pathname &&
		Date.now() - context.recordedAt <= ENTRY_CONTEXT_TTL_MS
	) {
		return context.entrySource;
	}

	return null;
};
