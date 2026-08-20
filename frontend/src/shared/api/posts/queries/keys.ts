export const postsQueryKeys = {
	all: ['posts'] as const,
	count: () => [...postsQueryKeys.all, 'count'] as const,
};
