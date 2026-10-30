import { queryOptions } from '@tanstack/react-query';

import { readPostDetail } from '@/shared/api/posts/api';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

import { postsQueryKeys } from '../keys';

export const postDetailQueryOptions = (slug: string, postId: number, sessionVersion: number) =>
	queryOptions<ApiResponse<PostDetailResponse>>({
		queryKey: postsQueryKeys.detail(slug, postId, sessionVersion),
		queryFn: ({ signal }) => readPostDetail({ slug: stripAtPrefix(slug), postId }, { cache: 'no-store', signal }),
		staleTime: 60_000,
		meta: { errorOperation: 'post.read' },
		retry: false,
	});
