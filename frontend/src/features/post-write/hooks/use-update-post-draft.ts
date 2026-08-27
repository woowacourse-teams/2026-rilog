'use client';

import { useCallback } from 'react';

import type { UpdatePostDraft } from '@/features/post-write/model/post-write-flow';
import { useOverwriteDraftMutation } from '@/shared/api/drafts/mutations/use-overwrite-draft-mutation';

export function useUpdatePostDraft(): UpdatePostDraft {
	const { mutateAsync: requestDraftOverwrite } = useOverwriteDraftMutation();

	return useCallback<UpdatePostDraft>(
		async (draftId, { title, blocks }) => {
			await requestDraftOverwrite({
				draftId,
				request: { title, content: blocks },
			});
		},
		[requestDraftOverwrite],
	);
}
