import type { TheRilogResponse } from '@/shared/api/the-rilog/types';

export const createTheRilogFixtureData = (overrides: Partial<TheRilogResponse> = {}): TheRilogResponse => ({
	blogSlug: 'the_rilog',
	date: '2026-10-13',
	news: {
		postId: 100,
		slug: 'the_rilog',
		title: 'Daily Headlines',
		publishedAt: '2026-10-13T05:00:00',
		headlines: [{ title: '새 모델 공개' }, { title: '웹 플랫폼 업데이트' }],
	},
	spotlights: [
		{
			postId: 101,
			slug: 'the_rilog',
			articleType: 'enterprise',
			title: '기업 기사',
			description: '기업 기사 요약',
			thumbnailImageUrl: null,
			publishedAt: '2026-10-12T05:00:00',
			source: { sourceProfileName: '테스트 기업', sourceProfileImage: null },
		},
		{
			postId: 102,
			slug: 'the_rilog',
			articleType: 'personal',
			title: '개인 기사',
			description: '개인 기사 요약',
			thumbnailImageUrl: null,
			publishedAt: '2026-10-12T05:00:00',
			source: null,
		},
	],
	...overrides,
});
