import { useCallback } from 'react';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { useAuth } from '@/features/auth/model/use-auth';
import type { InlineCommentSelectionTarget } from '@/features/post-detail/model/inline-comment-interaction';

export function useFloatingCommentCreation(
	postId: number,
	create: (target: InlineCommentSelectionTarget, entrySource?: InlineCommentCreateEntrySource) => void,
	close: () => void,
) {
	const { isAuthenticated } = useAuth();
	return useCallback(
		(target: InlineCommentSelectionTarget) => {
			analytics.inlineCommentSelectionReplyClicked({ postId, entrySource: 'floating_button' });
			create(target, 'floating_button');
			if (!isAuthenticated) close();
		},
		[close, create, isAuthenticated, postId],
	);
}
