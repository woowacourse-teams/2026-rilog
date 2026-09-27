import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export const postsQueryKeys = {
	all: ['posts'] as const,
	commentAnchorLists: (postId: number) => [...authenticatedQueryKeys.all, 'posts', 'comment-anchors', postId] as const,
	commentAnchors: (postId: number, isAuthenticated = false) =>
		[...postsQueryKeys.commentAnchorLists(postId), isAuthenticated] as const,
	commentAnchorsSidebar: (postId: number, isAuthenticated = false) =>
		[...postsQueryKeys.commentAnchorLists(postId), 'sidebar', isAuthenticated] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	details: () => [...postsQueryKeys.all, 'detail'] as const,
	detail: (slug: string, postId: number) => [...postsQueryKeys.details(), slug, postId] as const,
};
