'use client';

import { useCallback } from 'react';

import type { CreatePostDraft } from '@/features/post-write/model/post-write-flow';
import { useSaveDraftMutation } from '@/shared/api/drafts/mutations/use-save-draft-mutation';

export function useCreatePostDraft(): CreatePostDraft {
	const { mutateAsync: requestDraftSave } = useSaveDraftMutation();

	return useCallback<CreatePostDraft>(
		async ({ title, blocks }) => {
			const response = await requestDraftSave({ title, content: blocks });
			if (response.data === undefined) {
				throw new Error('임시저장 응답에 초안 정보가 없습니다.');
			}

			return response.data;
		},
		[requestDraftSave],
	);
}
