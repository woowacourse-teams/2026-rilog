import type { PostEntrySource, TheRilogAttribution } from '../model/analytics-event';

const POST_DETAIL_ENTRY_CONTEXT_KEY = 'rilog.post-detail-entry-context';

interface PostDetailEntryContext {
	postId: number;
	entrySource: Exclude<PostEntrySource, 'direct'>;
	feedPosition: number | null;
	theRilog?: TheRilogAttribution;
}

export const recordPostDetailEntryContext = (context: PostDetailEntryContext) => {
	try {
		window.sessionStorage.setItem(POST_DETAIL_ENTRY_CONTEXT_KEY, JSON.stringify(context));
	} catch {
		// Storage 사용 불가 시에도 게시글 이동은 계속한다.
	}
};

const isTheRilogAttribution = (value: unknown): value is TheRilogAttribution => {
	if (typeof value !== 'object' || value === null) return false;
	return (
		'theRilogVisitId' in value &&
		typeof value.theRilogVisitId === 'string' &&
		value.theRilogVisitId.length > 0 &&
		'theRilogClickId' in value &&
		typeof value.theRilogClickId === 'string' &&
		value.theRilogClickId.length > 0 &&
		'contentType' in value &&
		(value.contentType === 'headline' || value.contentType === 'enterprise' || value.contentType === 'personal') &&
		'position' in value &&
		typeof value.position === 'number' &&
		Number.isSafeInteger(value.position) &&
		value.position > 0 &&
		(value.contentType === 'headline'
			? 'headlineId' in value && typeof value.headlineId === 'string' && value.headlineId.length > 0
			: !('headlineId' in value))
	);
};

export const consumePostDetailEntryContext = (postId: number): Omit<PostDetailEntryContext, 'postId'> | null => {
	try {
		const rawContext = window.sessionStorage.getItem(POST_DETAIL_ENTRY_CONTEXT_KEY);
		window.sessionStorage.removeItem(POST_DETAIL_ENTRY_CONTEXT_KEY);
		if (rawContext === null) return null;
		const context: unknown = JSON.parse(rawContext);
		if (
			typeof context !== 'object' ||
			context === null ||
			!('postId' in context) ||
			!('entrySource' in context) ||
			!('feedPosition' in context) ||
			context.postId !== postId ||
			(context.entrySource !== 'feed' &&
				context.entrySource !== 'blog_profile' &&
				context.entrySource !== 'publish_redirect' &&
				context.entrySource !== 'the_rilog')
		) {
			return null;
		}

		if (context.entrySource === 'the_rilog' && (!('theRilog' in context) || !isTheRilogAttribution(context.theRilog)))
			return null;
		return {
			...(context.entrySource === 'the_rilog' && 'theRilog' in context && isTheRilogAttribution(context.theRilog)
				? { theRilog: context.theRilog }
				: {}),
			entrySource: context.entrySource,
			feedPosition: typeof context.feedPosition === 'number' ? context.feedPosition : null,
		};
	} catch {
		return null;
	}
};
