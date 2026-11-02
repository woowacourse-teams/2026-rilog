import type { PublicBlogFeedPostResponse } from '../src/shared/api/blogs/types';

export function createNavigationPosts(slug: string, chapterId: string | null): PublicBlogFeedPostResponse {
	const type = slug === 'navigation_team' ? 'COLOG' : 'RILOG';
	const chapterIds = chapterId === null ? [3, 4] : [Number(chapterId)];
	return {
		type,
		posts: chapterIds.map((id) => ({
			postId: id,
			title: id === 3 ? '첫 번째 글' : '두 번째 글',
			thumbnailImageUrl: null,
			category: '기술',
			chapter: { chapterId: id, name: id === 3 ? '첫 번째' : '두 번째', order: id },
			visibility: 'PUBLIC',
			publishedAt: '2026-11-01T00:00:00Z',
			totalCommentsCount: 0,
			author: { userId: 1, nickname: '테스트', slug: 'navigation_personal', profileImageUrl: null },
			owner: { blogId: 850, type, slug, name: '탐색 테스트', profileImageUrl: null },
		})),
		page: 0,
		size: 12,
		numberOfElements: chapterIds.length,
		hasNext: false,
	};
}
