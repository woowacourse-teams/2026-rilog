export const feedsKeys = {
	all: ['feeds'] as const,
	fullPosts: (size: number) => [...feedsKeys.all, 'posts', 'full', { size }] as const,
};
