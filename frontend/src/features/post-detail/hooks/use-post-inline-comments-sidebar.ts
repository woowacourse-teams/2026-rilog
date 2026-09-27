'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { usePostCommentAnchorsSidebarQuery } from '@/shared/api/posts/queries/comment-anchors-sidebar/use-query';

import { mapPostCommentAnchorsSidebarResponse } from '../lib/map-post-comment-anchors-sidebar-response';

export const usePostInlineCommentsSidebar = (postId: number) => {
	const { isInitialized, isAuthenticated } = useAuth();
	return usePostCommentAnchorsSidebarQuery({
		postId,
		isAuthenticated,
		isEnabled: isInitialized,
		select: mapPostCommentAnchorsSidebarResponse,
	});
};
