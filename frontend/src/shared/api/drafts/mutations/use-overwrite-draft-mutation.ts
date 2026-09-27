'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { overwriteDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import type { DraftSaveRequest } from '@/shared/api/drafts/types';
import { getInvalidPostInputFields } from '@/shared/api/posts/input-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

interface OverwriteDraftVariables {
	draftId: number;
	request: DraftSaveRequest;
}

export const useOverwriteDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ draftId, request }: OverwriteDraftVariables) => overwriteDraft(draftId, request),
		meta: { errorTracking: 'local' },
		onError: (error, variables) =>
			apiErrorReporter.report(error, {
				operation: 'draft.overwrite',
				invalidUserInputFields: getInvalidPostInputFields(variables.request.title),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all }),
	});
};
