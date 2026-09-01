'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { renameBlogChapter } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import type { ChapterRenameRequest } from '@/shared/api/blogs/types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface RenameBlogChapterVariables {
	slug: string;
	chapterId: number;
	request: ChapterRenameRequest;
}

export const useRenameBlogChapterMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ slug, chapterId, request }: RenameBlogChapterVariables) =>
			renameBlogChapter(slug, chapterId, request),
		onSuccess: (_, { slug }) => {
			const normalizedSlug = stripAtPrefix(slug);

			return Promise.all([
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.chapters(normalizedSlug), exact: true }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.index(normalizedSlug), exact: true }),
			]);
		},
	});
};
