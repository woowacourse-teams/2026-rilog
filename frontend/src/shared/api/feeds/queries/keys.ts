import type { FullFeedPostsFilters } from '../types';

interface FullFeedPostsKeyOptions extends FullFeedPostsFilters {
	size: number;
}

export const feedsQueryKeys = {
	all: ['feeds'] as const,
	fullFeedPosts: ({ size, category, blogType }: FullFeedPostsKeyOptions) => {
		return [
			...feedsQueryKeys.all,
			'posts',
			'full',
			{
				size,
				...(blogType === undefined ? {} : { blogType }),
				...(category === undefined ? {} : { category }),
			},
		] as const;
	},
};
