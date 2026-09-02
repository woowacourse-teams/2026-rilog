import { queryOptions } from '@tanstack/react-query';

import type { ChapterResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

import { readBlogChapters } from '../../api';
import { blogsQueryKeys } from '../keys';

export const blogChaptersQueryOptions = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return queryOptions<ApiResponse<ChapterResponse[]>>({
		queryKey: blogsQueryKeys.chapters(normalizedSlug),
		queryFn: () => readBlogChapters(normalizedSlug),
		retry: false,
	});
};
