'use client';

import { mapBlogChapterResponse } from '@/features/post-write/lib/map-blog-chapter-response';
import { useBlogChaptersQuery } from '@/shared/api/blogs/queries/chapters/use-query';

interface UsePostPublishChaptersOptions {
	slug: string;
	isEnabled: boolean;
}

export const usePostPublishChapters = ({ slug, isEnabled }: UsePostPublishChaptersOptions) =>
	useBlogChaptersQuery({
		slug,
		isEnabled,
		select: (response) => mapBlogChapterResponse(response.data ?? []),
	});
