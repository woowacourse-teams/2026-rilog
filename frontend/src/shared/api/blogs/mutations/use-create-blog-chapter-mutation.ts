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

export const useCreateBlogChapterMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, request }: CreateBlogChapterVariables) => createBlogChapter(slug, request),
		onSuccess: (_, { slug }) =>
			queryClient.invalidateQueries({
				queryKey: blogsQueryKeys.chapters(stripAtPrefix(slug)),
				exact: true,
			}),
	});
};
