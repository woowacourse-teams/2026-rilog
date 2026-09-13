'use client';

import { usePostsCountQuery } from '@/shared/api/posts/queries/posts-count/use-query';

export type SidebarPostsCountState =
	| { status: 'pending'; totalPostsCount?: never }
	| { status: 'error'; totalPostsCount?: never }
	| { status: 'success'; totalPostsCount: number };

export const useSidebarPostsCount = (): SidebarPostsCountState => {
	const postsCountQuery = usePostsCountQuery({
		select: (response) => response.data?.totalPostsCount,
	});
	if (postsCountQuery.data !== undefined) {
		return { status: 'success', totalPostsCount: postsCountQuery.data };
	}

	return { status: postsCountQuery.isPending ? 'pending' : 'error' };
};
