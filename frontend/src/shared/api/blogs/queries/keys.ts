export const blogsQueryKeys = {
	all: ['blogs'] as const,
	publicProfile: (slug: string) => [...blogsQueryKeys.all, 'public-profile', slug] as const,
	publicBlogPosts: (slug: string) => [...blogsQueryKeys.all, 'public-posts', slug] as const,
	chapters: (slug: string) => [...blogsQueryKeys.all, 'chapters', slug] as const,
};
