'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { usePostCommentAnchorsQuery } from '@/shared/api/posts/queries/comment-anchors/use-query';

import { mapPostCommentAnchorsResponse } from '../lib/map-post-comment-anchors-response';

export const usePostInlineComments = (postId: number) => {
	const { isInitialized, isAuthenticated } = useAuth();
	return usePostCommentAnchorsQuery({
		postId,
		isAuthenticated,
		isEnabled: isInitialized,
		select: mapPostCommentAnchorsResponse,
	});
};
