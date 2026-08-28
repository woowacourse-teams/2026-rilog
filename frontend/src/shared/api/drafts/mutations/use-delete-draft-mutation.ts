'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

export const useDeleteDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (postId: number) => deleteDraft(postId),
		onSuccess: (_, postId) => {
			queryClient.removeQueries({ queryKey: draftsQueryKeys.detail(postId), exact: true });

			return queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all });
		},
	});
};
