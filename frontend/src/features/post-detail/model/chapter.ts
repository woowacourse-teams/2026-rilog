export interface CologChapterPostAuthor {
	slug: string;
	nickname: string;
}

export interface CologChapterPostSuggestion {
	thumbnailUrl: string | null;
	id: number;
	title: string;
	author: CologChapterPostAuthor;
}

export interface CologChapterPostSuggestions {
	id: number;
	name: string;
	posts: readonly CologChapterPostSuggestion[];
}
