export const CHAPTER_NAME_MAX_LENGTH = 20;

export interface Chapter {
	id: number;
	name: string;
}

export interface OrderedChapter extends Chapter {
	order: number;
}

export interface ChapterSummary extends Chapter {
	postCount: number;
}
