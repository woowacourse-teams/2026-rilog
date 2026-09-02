'use client';

import type { PostViewerPermissions } from '@/domains/post/model/post';
import { useAuth } from '@/features/auth/model/use-auth';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';

interface UsePostViewerPermissionsOptions {
	postId: number;
	initialPermissions: PostViewerPermissions;
}

export const usePostViewerPermissions = ({ postId, initialPermissions }: UsePostViewerPermissionsOptions) => {
	const { isAuthenticated, isInitialized } = useAuth();
	const isAuthenticatedUserReady = isInitialized && isAuthenticated;
	const postDetailQuery = usePostDetailQuery({
		postId,
		isEnabled: isAuthenticatedUserReady,
		select: (response) => response.data?.viewerPermissions,
	});

	return isAuthenticatedUserReady ? (postDetailQuery.data ?? initialPermissions) : initialPermissions;
};
