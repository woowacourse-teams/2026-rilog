import { queryOptions } from '@tanstack/react-query';

import { readPostDetail } from '@/shared/api/posts/api';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { postsQueryKeys } from '../keys';

export const postDetailQueryOptions = (slug: string, postId: number) =>
	queryOptions<ApiResponse<PostDetailResponse>>({
		queryKey: postsQueryKeys.detail(slug, postId),
		queryFn: () => readPostDetail({ slug, postId }),
		staleTime: 60_000,
		retry: false,
	});
