import { queryOptions } from '@tanstack/react-query';

import type { BlogIndexResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

import { readBlogIndex } from '../../api';
import { blogsQueryKeys } from '../keys';

export const blogIndexQueryOptions = (slug: string) => {
	const normalizedSlug = stripAtPrefix(slug);

	return queryOptions<ApiResponse<BlogIndexResponse>>({
		queryKey: blogsQueryKeys.index(normalizedSlug),
		queryFn: () => readBlogIndex(normalizedSlug),
		staleTime: 60_000,
		retry: false,
	});
};
