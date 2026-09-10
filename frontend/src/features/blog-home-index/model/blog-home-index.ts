import type { ChapterSummary } from '@/domains/chapter/model/chapter';

export interface BlogHomeCologIndexItem {
	id: number;
	name: string;
	postCount: number;
	slug: string;
	profileImageUrl: string | null;
}

export interface BlogHomeIndex {
	totalCount: number;
	chapterIndexes: ChapterSummary[];
	cologIndexes: BlogHomeCologIndexItem[];
}
