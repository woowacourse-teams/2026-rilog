export interface SeriesPost {
	title: string;
	postId: number;
}

export interface SeriesChapter {
	chapter: string;
	chapterId: number;
	postCount: number;
	posts: SeriesPost[];
}
