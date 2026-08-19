export const usersQueryKeys = {
	all: ['users'] as const,
	userBySlug: (slug: string) => [...usersQueryKeys.all, 'user-by-slug', slug] as const,
};
