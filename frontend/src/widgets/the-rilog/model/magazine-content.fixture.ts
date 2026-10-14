import type { MagazineArticle } from '@/features/the-rilog/model/magazine';
import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';

export const DAILY_HEADLINES: readonly DailyHeadline[] = [
	{ id: 'headline-1', title: '헤드라인 1', href: '/@news/1#headline-1' },
	{ id: 'headline-2', title: '헤드라인 2', href: '/@news/1#headline-2' },
];

export const MAGAZINE_ARTICLES: readonly MagazineArticle[] = [
	{
		id: 'people-behind-tools',
		href: '/@articles/people-behind-tools',
		title: '기사 1',
		summary: '기사 1 요약',
		thumbnailImageUrl: null,
		profile: {
			type: 'bloger',
			name: '리로',
			profileImageUrl: '/images/profile-placeholder.svg',
		},
	},
	{
		id: 'small-model-choice',
		href: '/@articles/small-model-choice',
		title: '기사 2',
		summary: '기사 2 요약',
		thumbnailImageUrl: null,
		profile: {
			type: 'bloger',
			name: '하루',
			profileImageUrl: '/images/profile-placeholder.svg',
		},
	},
	{
		id: 'open-source-trust',
		href: '/@articles/open-source-trust',
		title: '기사 3',
		summary: '기사 3 요약',
		thumbnailImageUrl: null,
		profile: {
			type: 'enterprise',
			name: '오픈소스 스튜디오',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
	{
		id: 'browser-experiments',
		href: '/@articles/browser-experiments',
		title: '기사 4',
		summary: '기사 4 요약',
		thumbnailImageUrl: null,
		profile: {
			type: 'enterprise',
			name: 'Rilog Labs',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
	{
		id: 'company-platforms',
		href: '/@articles/company-platforms',
		title: '기사 5',
		summary: '기사 5 요약',
		thumbnailImageUrl: null,
		profile: {
			type: 'enterprise',
			name: '플랫폼 스튜디오',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
];
