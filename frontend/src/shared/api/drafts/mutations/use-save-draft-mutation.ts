'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saveDraft } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import { getInvalidPostInputFields } from '@/shared/api/posts/input-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

export const useSaveDraftMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveDraft,
		meta: { errorTracking: 'local' },
		onError: (error, variables) =>
			apiErrorReporter.report(error, {
				operation: 'draft.save',
				invalidUserInputFields: getInvalidPostInputFields(variables.title),
			}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: draftsQueryKeys.all }),
	});
};
