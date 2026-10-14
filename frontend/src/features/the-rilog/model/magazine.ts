import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';

export interface MagazineArticle {
	id: string;
	postId: number;
	title: string;
	summary: string;
	thumbnailImageUrl: string | null;
	href: string;
	profile: {
		type: 'bloger' | 'enterprise';
		name: string;
		profileImageUrl: string | null;
	};
}

export interface MagazineContent {
	dailyHeadlines: DailyHeadline[];
	articles: MagazineArticle[];
}
