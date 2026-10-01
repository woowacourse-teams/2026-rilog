import { usePostsCountQuery } from '@/shared/api/posts/queries/posts-count/use-query';

import { mapPostsCountResponse } from '../lib/map-posts-count-response';

export function useTotalPostsCount(options?: { isEnabled?: boolean }) {
	return usePostsCountQuery({
		...options,
		select: (response) => mapPostsCountResponse(response).totalPostsCount,
	});
}
