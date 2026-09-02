import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

export const blogsQueryKeys = {
	all: ['blogs'] as const,
	publicProfile: (slug: string) => [...blogsQueryKeys.all, 'public-profile', slug] as const,
	publicBlogPosts: (slug: string) => [...blogsQueryKeys.all, 'public-posts', slug] as const,
	publicBlogPostsFilter: (slug: string, filter: PublicBlogPostsFilter) =>
		[...blogsQueryKeys.publicBlogPosts(slug), filter] as const,
	index: (slug: string) => [...blogsQueryKeys.all, 'index', slug] as const,
	chapters: (slug: string) => [...blogsQueryKeys.all, 'chapters', slug] as const,
};
