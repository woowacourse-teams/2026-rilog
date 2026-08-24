export const postsQueryKeys = {
	all: ['posts'] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
	detail: (postId: number) => [...postsQueryKeys.all, 'detail', postId] as const,
};
