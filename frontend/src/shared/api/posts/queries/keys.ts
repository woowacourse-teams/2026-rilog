export const postsQueryKeys = {
	all: ['posts'] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	details: () => [...postsQueryKeys.all, 'detail'] as const,
	detail: (slug: string, postId: number) => [...postsQueryKeys.details(), slug, postId] as const,
};
