export interface SeriesPost {
	id: number;
	title: string;
}

export interface SeriesChapter {
	id: number;
	name: string;
	postCount: number;
	posts: SeriesPost[];
}
