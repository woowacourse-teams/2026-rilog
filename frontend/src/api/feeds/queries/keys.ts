export const keys = {
	all: ['feeds'] as const,
	fullPosts: (size: number) => [...keys.all, 'posts', 'full', { size }] as const,
};
