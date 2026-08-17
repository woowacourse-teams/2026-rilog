export const blogsQueryKeys = {
	all: ['blogs'] as const,
	postDetail: (slug: string, postId: number) => [...blogsQueryKeys.all, 'posts', slug, postId] as const,
};
