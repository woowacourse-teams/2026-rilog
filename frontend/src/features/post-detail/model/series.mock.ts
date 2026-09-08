import type { SeriesChapter } from './series';

export const MOCK_SERIES_CHAPTER: SeriesChapter = {
	id: 3,
	name: 'Next.js로 블로그 만들기',
	postCount: 3,
	posts: [
		{ id: 65, title: '프로젝트 구조와 App Router 설계' },
		{ id: 102, title: 'Server Component로 데이터 가져오기' },
		{ id: 103, title: '검색 엔진이 이해하는 게시글 페이지 만들기' },
	],
};
