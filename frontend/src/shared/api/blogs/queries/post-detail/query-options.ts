import { queryOptions } from '@tanstack/react-query';

import type { PostDetailResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { readBlogPostDetail } from '../../api';
import { blogsQueryKeys } from '../keys';

export const blogPostDetailQueryOptions = (slug: string, postId: number) =>
	queryOptions<ApiResponse<PostDetailResponse>>({
		queryKey: blogsQueryKeys.postDetail(slug, postId),
		queryFn: () => readBlogPostDetail({ slug, postId }),
		staleTime: 60_000,
		retry: false,
	});
