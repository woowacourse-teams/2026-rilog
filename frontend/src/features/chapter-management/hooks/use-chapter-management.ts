'use client';

import { useState } from 'react';

import { useCreateBlogChapterMutation } from '@/shared/api/blogs/mutations/use-create-blog-chapter-mutation';
import { useRenameBlogChapterMutation } from '@/shared/api/blogs/mutations/use-rename-blog-chapter-mutation';
import { useBlogChaptersQuery } from '@/shared/api/blogs/queries/chapters/use-query';

import { mapChapterResponses } from '../lib/map-chapter-response';

import { useChapterDrafts } from './use-chapter-drafts';

interface UseChapterManagementOptions {
	slug: string;
}

export function useChapterManagement({ slug }: UseChapterManagementOptions) {
	const chaptersQuery = useBlogChaptersQuery({
		slug,
		select: (response) => (response.data === undefined ? undefined : mapChapterResponses(response.data)),
	});
	const drafts = useChapterDrafts({ initialChapters: chaptersQuery.data });
	const createChapter = useCreateBlogChapterMutation();
	const renameChapter = useRenameBlogChapterMutation();
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<unknown>(null);

	const handleStartEditing = () => {
		setSaveError(null);
		drafts.handleStartEditing();
	};

	const handleNameChange = (chapterId: number, name: string) => {
		setSaveError(null);
		drafts.handleNameChange(chapterId, name);
	};

	const handleSave = async () => {
		if (isSaving || !drafts.isDirty || drafts.draftChapters.some((draft) => draft.name.trim().length === 0)) {
			return;
		}

		setIsSaving(true);
		setSaveError(null);

		const results = await Promise.allSettled(
			drafts.draftChapters.map((draft) =>
				renameChapter.mutateAsync({
					slug,
					chapterId: draft.id,
					request: { name: draft.name.trim() },
				}),
			),
		);
		const savedChapterIds = results.flatMap((result, index) =>
			result.status === 'fulfilled' ? [drafts.draftChapters[index].id] : [],
		);
		const failedResult = results.find((result) => result.status === 'rejected');

		drafts.handleSaveChapters(savedChapterIds);
		setSaveError(failedResult?.status === 'rejected' ? failedResult.reason : null);
		setIsSaving(false);
	};

	const handleAddChapter = async (name: string) => {
		await createChapter.mutateAsync({ slug, request: { name: name.trim() } });
	};

	return {
		...drafts,
		handleStartEditing,
		handleNameChange,
		handleSave,
		handleAddChapter,
		isLoading: chaptersQuery.isPending,
		isLoadError: chaptersQuery.isError || (!chaptersQuery.isPending && chaptersQuery.data === undefined),
		loadError: chaptersQuery.error,
		refetch: chaptersQuery.refetch,
		isCreating: createChapter.isPending,
		createError: createChapter.error,
		resetCreateError: createChapter.reset,
		isSaving,
		saveError,
	};
}
