export const postsQueryKeys = {
	all: ['posts'] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	details: () => [...postsQueryKeys.all, 'detail'] as const,
	detail: (postId: number) => [...postsQueryKeys.details(), postId] as const,
};
