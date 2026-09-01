import type { PostPublishChapterOption } from '../model/post-publication';

import type { ChapterResponse } from '@/shared/api/blogs/types';

export const mapBlogChapterResponse = (chapters: ChapterResponse[]): PostPublishChapterOption[] =>
	chapters.map(({ chapterId, name }) => ({ value: String(chapterId), label: name }));
