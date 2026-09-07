import type { SeriesChapter } from './series';

export const MOCK_SERIES_CHAPTER: SeriesChapter = {
	chapter: 'Next.js로 블로그 만들기',
	chapterId: 3,
	postCount: 3,
	posts: [
		{ title: '프로젝트 구조와 App Router 설계', postId: 65 },
		{ title: 'Server Component로 데이터 가져오기', postId: 102 },
		{ title: '검색 엔진이 이해하는 게시글 페이지 만들기', postId: 103 },
	],
};
