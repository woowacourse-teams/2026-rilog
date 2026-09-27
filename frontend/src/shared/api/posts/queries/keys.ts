import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export const postsQueryKeys = {
	all: ['posts'] as const,
	commentAnchors: (postId: number, isAuthenticated = false) =>
		[...authenticatedQueryKeys.all, 'posts', 'comment-anchors', postId, isAuthenticated] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	details: () => [...postsQueryKeys.all, 'detail'] as const,
	detail: (slug: string, postId: number) => [...postsQueryKeys.details(), slug, postId] as const,
};
