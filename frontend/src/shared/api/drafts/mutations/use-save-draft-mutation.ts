'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

export const useSaveDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveDraft,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all }),
	});
};
