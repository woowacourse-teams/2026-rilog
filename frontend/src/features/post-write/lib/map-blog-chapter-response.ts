import type { ChapterResponse } from '@/shared/api/blogs/types';

export interface BlogChapterOption {
	value: string;
	label: string;
}

export const mapBlogChapterResponse = (chapters: ChapterResponse[]): BlogChapterOption[] =>
	chapters.map(({ chapterId, name }) => ({ value: String(chapterId), label: name }));
