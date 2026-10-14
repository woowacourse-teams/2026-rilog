export interface TheRilogSourceResponse {
	sourceProfileName: string;
	sourceProfileImage: string | null;
}

export interface TheRilogHeadlineResponse {
	title: string;
}

export interface TheRilogNewsResponse {
	postId: number;
	slug: string;
	title: string;
	publishedAt: string;
	headlines: TheRilogHeadlineResponse[];
}

export interface TheRilogSpotlightResponse {
	postId: number;
	slug: string;
	articleType: 'enterprise' | 'personal';
	title: string;
	description: string;
	thumbnailImageUrl: string | null;
	publishedAt: string;
	source: TheRilogSourceResponse | null;
}

export interface TheRilogResponse {
	blogSlug: string;
	date: string | null;
	news: TheRilogNewsResponse | null;
	spotlights: TheRilogSpotlightResponse[];
}
