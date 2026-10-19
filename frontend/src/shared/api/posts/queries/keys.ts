import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const postsQueryKeys = {
	all: ['posts'] as const,
	commentAnchorLists: (postId: number) => [...authenticatedQueryKeys.all, 'posts', 'comment-anchors', postId] as const,
	commentAnchors: (postId: number, isAuthenticated = false) =>
		[...postsQueryKeys.commentAnchorLists(postId), isAuthenticated] as const,
	commentAnchorsSidebar: (postId: number, isAuthenticated = false) =>
		[...postsQueryKeys.commentAnchorLists(postId), 'sidebar', isAuthenticated] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	details: () => [...authenticatedQueryKeys.all, 'posts', 'detail'] as const,
	detail: (slug: string, postId: number, sessionVersion: number) =>
		[...postsQueryKeys.details(), stripAtPrefix(slug), postId, sessionVersion] as const,
};

export const isPostDetailQueryKey = (queryKey: readonly unknown[]) =>
	postsQueryKeys.details().every((segment, index) => queryKey[index] === segment);

export const isPreviousSessionPostDetailQueryKey = (queryKey: readonly unknown[], sessionVersion: number) =>
	isPostDetailQueryKey(queryKey) && queryKey.at(-1) !== sessionVersion;
