import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';
import { readPublicBlogPosts } from '@/shared/api/blogs/api';

import { mapChapterPostSuggestionsResponse } from './map-chapter-post-suggestions-response';

const CHAPTER_POST_SUGGESTIONS_PAGE = 0;
const CHAPTER_POST_SUGGESTIONS_PAGE_SIZE = 4;
const MAX_CHAPTER_POST_SUGGESTION_COUNT = 3;

interface GetChapterPostSuggestionsOptions {
	slug: string;
	chapter: OrderedChapter;
	currentPostId: number;
}

export const getChapterPostSuggestions = async ({
	slug,
	chapter,
	currentPostId,
}: GetChapterPostSuggestionsOptions): Promise<CologChapterPostSuggestions | null> => {
	try {
		const response = await readPublicBlogPosts({
			slug,
			page: CHAPTER_POST_SUGGESTIONS_PAGE,
			size: CHAPTER_POST_SUGGESTIONS_PAGE_SIZE,
			filter: { type: 'chapterId', chapterId: chapter.id },
		});

		const suggestions = mapChapterPostSuggestionsResponse(response, chapter);

		return {
			...suggestions,
			posts: suggestions.posts.filter((post) => post.id !== currentPostId).slice(0, MAX_CHAPTER_POST_SUGGESTION_COUNT),
		};
	} catch {
		return null;
	}
};
