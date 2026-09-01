'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBlogChapter } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import type { ChapterCreateRequest } from '@/shared/api/blogs/types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface CreateBlogChapterVariables {
	slug: string;
	request: ChapterCreateRequest;
}

export const CREATE_BLOG_CHAPTER_MUTATION_KEY = ['blogs', 'chapters', 'create'] as const;

export const useCreateBlogChapterMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: CREATE_BLOG_CHAPTER_MUTATION_KEY,
		mutationFn: ({ slug, request }: CreateBlogChapterVariables) => createBlogChapter(slug, request),
		onSuccess: (_, { slug }) => {
			const normalizedSlug = stripAtPrefix(slug);

			return Promise.all([
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.chapters(normalizedSlug), exact: true }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.index(normalizedSlug), exact: true }),
			]);
		},
	});
};
