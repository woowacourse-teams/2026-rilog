'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { publishDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import type { DraftPublishRequest } from '@/shared/api/drafts/types';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

interface PublishDraftVariables {
	draftId: number;
	request: DraftPublishRequest;
}

export const usePublishDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ draftId, request }: PublishDraftVariables) => publishDraft(draftId, request),
		onSuccess: (_, { draftId, request }) => {
			queryClient.removeQueries({ queryKey: draftsQueryKeys.detail(draftId), exact: true });

			return Promise.all([
				queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: feedsQueryKeys.all }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.publicBlogPosts(request.slug) }),
				queryClient.invalidateQueries({ queryKey: blogsQueryKeys.publicProfile(request.slug) }),
				queryClient.invalidateQueries({ queryKey: postsQueryKeys.count() }),
			]);
		},
	});
};
