'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { renameBlogChapter } from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import type { ChapterRenameRequest } from '@/shared/api/blogs/types';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';
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
		onSuccess: (_, { slug }) =>
			Promise.all([
				queryClient.invalidateQueries({
					queryKey: blogsQueryKeys.chapters(stripAtPrefix(slug)),
					exact: true,
				}),
				queryClient.invalidateQueries({ queryKey: usersQueryKeys.myCologsOverview() }),
			]),
	});
};
