export interface BlogHomeIndexItem {
	id: number;
	name: string;
	postCount: number;
}

export interface BlogHomeCologIndexItem extends BlogHomeIndexItem {
	slug: string;
	profileImageUrl: string | null;
}

export interface BlogHomeIndex {
	totalCount: number;
	chapterIndexes: BlogHomeIndexItem[];
	cologIndexes: BlogHomeCologIndexItem[];
}
