import type { CologChapterPostSuggestions } from './chapter';

export const MOCK_CHAPTER: CologChapterPostSuggestions = {
	id: 1,
	name: '프론트엔드',
	posts: [
		{
			id: 101,
			title: '함께 만드는 서버 컴포넌트 두 줄이 넘어가면 이렇게 표시됩니다.',
			thumbnailUrl: '/images/default-post-cover.svg',
			author: { slug: 'rilogger', nickname: '리로거' },
		},
		{
			id: 102,
			title: '접근 가능한 인터페이스를 설계하는 방법 두 줄이 넘어가면 이렇게 표시되고 세 줄이 넘어가면',
			thumbnailUrl: null,
			author: { slug: 'saebom', nickname: '새봄' },
		},
		{
			id: 103,
			title: '디자인 토큰으로 일관성 있는 UI 만들기',
			thumbnailUrl: '/images/colog-placeholder.svg',
			author: { slug: 'summer', nickname: '여름' },
		},
	],
};
