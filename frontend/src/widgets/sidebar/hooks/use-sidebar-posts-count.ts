'use client';

import { useTotalPostsCount } from '@/features/post-count/hooks/use-total-posts-count';

export type SidebarPostsCountState =
	| { status: 'pending'; totalPostsCount?: never }
	| { status: 'error'; totalPostsCount?: never }
	| { status: 'success'; totalPostsCount: number };

export const useSidebarPostsCount = (): SidebarPostsCountState => {
	const postsCountQuery = useTotalPostsCount();
	if (postsCountQuery.data !== undefined) {
		return { status: 'success', totalPostsCount: postsCountQuery.data };
	}

	return { status: postsCountQuery.isPending ? 'pending' : 'error' };
};
