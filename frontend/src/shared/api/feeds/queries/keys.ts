export const feedsQueryKeys = {
	all: ['feeds'] as const,
	fullFeedPosts: (size: number) => [...feedsQueryKeys.all, 'posts', 'full', { size }] as const,
};
