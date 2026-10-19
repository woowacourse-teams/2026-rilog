'use client';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';

const HIDDEN_VIEWER_STATE = { viewerPermissions: { canEdit: false, canDelete: false }, viewCount: null };

export const usePostViewerState = (slug: string, postId: number) => {
	const { isAuthenticated, isInitialized, sessionVersion } = useAuth();
	const isReady = isInitialized && isAuthenticated && sessionVersion === tokenManager.getSessionVersion();
	const detail = usePostDetailQuery({
		slug,
		postId,
		sessionVersion,
		isEnabled: isReady,
		select: (response) =>
			response.data === undefined
				? undefined
				: {
						viewerPermissions: response.data.viewerPermissions,
						viewCount: response.data.viewCount,
					},
	});
	const state =
		isReady && detail.isSuccess && !detail.isFetching ? (detail.data ?? HIDDEN_VIEWER_STATE) : HIDDEN_VIEWER_STATE;
	return { ...state, sessionVersion };
};
