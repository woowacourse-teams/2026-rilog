import type { Chapter } from '@/domains/chapter/model/chapter';
import type { ChapterResponse } from '@/shared/api/blogs/types';

export const mapChapterResponses = (responses: ChapterResponse[]): Chapter[] =>
	responses
		.toSorted((left, right) => left.order - right.order)
		.map((response) => ({
			id: response.chapterId,
			name: response.name,
		}));
