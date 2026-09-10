import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';
import { readPublicBlogPosts } from '@/shared/api/blogs/api';

import { mapChapterPostSuggestionsResponse } from './map-chapter-post-suggestions-response';

const CHAPTER_POST_SUGGESTIONS_PAGE = 0;
const CHAPTER_POST_SUGGESTIONS_PAGE_SIZE = 3;

interface GetChapterPostSuggestionsOptions {
	slug: string;
	chapter: OrderedChapter;
}

export const getChapterPostSuggestions = async ({
	slug,
	chapter,
}: GetChapterPostSuggestionsOptions): Promise<CologChapterPostSuggestions | null> => {
	try {
		const response = await readPublicBlogPosts({
			slug,
			page: CHAPTER_POST_SUGGESTIONS_PAGE,
			size: CHAPTER_POST_SUGGESTIONS_PAGE_SIZE,
			filter: { type: 'chapterId', chapterId: chapter.id },
		});

		return mapChapterPostSuggestionsResponse(response, chapter);
	} catch {
		return null;
	}
};
