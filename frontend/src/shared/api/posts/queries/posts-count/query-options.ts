import { queryOptions } from '@tanstack/react-query';

import { readPostsCount } from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

export const postsCountQueryOptions = () =>
	queryOptions({
		queryKey: postsQueryKeys.count(),
		queryFn: () => readPostsCount(),
	});
