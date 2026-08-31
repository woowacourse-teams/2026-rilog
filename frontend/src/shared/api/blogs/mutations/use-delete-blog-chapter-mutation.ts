'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteBlogChapter } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface DeleteBlogChapterVariables {
	slug: string;
	chapterId: number;
}

export const useDeleteBlogChapterMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, chapterId }: DeleteBlogChapterVariables) => deleteBlogChapter(slug, chapterId),
		onSuccess: (_, { slug }) =>
			queryClient.invalidateQueries({
				queryKey: blogsQueryKeys.chapters(stripAtPrefix(slug)),
				exact: true,
			}),
	});
};
