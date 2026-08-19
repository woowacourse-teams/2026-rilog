import { queryOptions } from '@tanstack/react-query';

import type { CologPublicProfileResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { readBlogPublicProfile } from '../../api';
import { blogsQueryKeys } from '../keys';

export const blogPublicProfileQueryOptions = (slug: string) =>
	queryOptions<ApiResponse<CologPublicProfileResponse>>({
		queryKey: blogsQueryKeys.publicProfile(slug),
		queryFn: () => readBlogPublicProfile({ slug }),
		staleTime: 60_000,
		retry: false,
	});
