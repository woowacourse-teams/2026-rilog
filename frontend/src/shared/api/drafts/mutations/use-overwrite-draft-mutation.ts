'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { overwriteDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import type { DraftSaveRequest } from '@/shared/api/drafts/types';

interface OverwriteDraftVariables {
	draftId: number;
	request: DraftSaveRequest;
}

export const useOverwriteDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ draftId, request }: OverwriteDraftVariables) => overwriteDraft(draftId, request),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all }),
	});
};
