export const cologsQueryKeys = {
	all: ['cologs'] as const,
	members: (slug: string) => [...cologsQueryKeys.all, slug, 'members'] as const,
};
