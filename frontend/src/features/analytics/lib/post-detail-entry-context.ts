import type { PostEntrySource } from '../model/analytics-event';

const POST_DETAIL_ENTRY_CONTEXT_KEY = 'rilog.post-detail-entry-context';

interface PostDetailEntryContext {
	postId: number;
	entrySource: Exclude<PostEntrySource, 'direct'>;
	feedPosition: number | null;
}

export const recordPostDetailEntryContext = (context: PostDetailEntryContext) => {
	window.sessionStorage.setItem(POST_DETAIL_ENTRY_CONTEXT_KEY, JSON.stringify(context));
};

export const consumePostDetailEntryContext = (postId: number): Omit<PostDetailEntryContext, 'postId'> | null => {
	const rawContext = window.sessionStorage.getItem(POST_DETAIL_ENTRY_CONTEXT_KEY);
	window.sessionStorage.removeItem(POST_DETAIL_ENTRY_CONTEXT_KEY);

	if (rawContext === null) {
		return null;
	}

	try {
		const context = JSON.parse(rawContext) as Partial<PostDetailEntryContext>;
		if (
			context.postId !== postId ||
			(context.entrySource !== 'feed' &&
				context.entrySource !== 'blog_profile' &&
				context.entrySource !== 'publish_redirect')
		) {
			return null;
		}

		return {
			entrySource: context.entrySource,
			feedPosition: typeof context.feedPosition === 'number' ? context.feedPosition : null,
		};
	} catch {
		return null;
	}
};
