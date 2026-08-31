'use client';

import { useEffect, useRef, useState } from 'react';

import type { CologChapter } from '../model/colog-chapter';

export type CologChapterDraft = Pick<CologChapter, 'id' | 'name'>;

interface UseCologChapterDraftsOptions {
	initialChapters?: CologChapter[];
}

export function useCologChapterDrafts({ initialChapters }: UseCologChapterDraftsOptions = {}) {
	const hasInitializedChapters = useRef(initialChapters !== undefined);
	// TODO: 챕터 API 연동 시 state 대신 query 기반으로 변경
	const [chapters, setChapters] = useState(() => initialChapters?.map((chapter) => ({ ...chapter })) ?? []);
	const [draftChapters, setDraftChapters] = useState<CologChapterDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	useEffect(() => {
		if (initialChapters === undefined || hasInitializedChapters.current) {
			return;
		}

		setChapters(initialChapters.map((chapter) => ({ ...chapter })));
		hasInitializedChapters.current = true;
	}, [initialChapters]);

	const isDirty = draftChapters.length > 0;
	const displayedChapters = chapters.map((chapter) => {
		const draftChapter = draftChapters.find((draft) => draft.id === chapter.id);
		return draftChapter === undefined ? chapter : { ...chapter, ...draftChapter };
	});

	const handleStartEditing = () => {
		setDraftChapters([]);
		setIsEditing(true);
	};

	const handleCancelEditing = () => {
		setDraftChapters([]);
		setIsEditing(false);
	};

	const handleSave = () => {
		setChapters((currentChapters) =>
			currentChapters.map((chapter) => {
				const draftChapter = draftChapters.find((draft) => draft.id === chapter.id);
				return draftChapter === undefined ? chapter : { ...chapter, ...draftChapter };
			}),
		);
		setDraftChapters([]);
		setIsEditing(false);
	};

	const handleNameChange = (chapterId: number, name: string) => {
		const originalChapter = chapters.find((chapter) => chapter.id === chapterId);
		if (originalChapter === undefined) {
			return;
		}

		setDraftChapters((currentDrafts) => {
			const currentDraft = currentDrafts.find((draft) => draft.id === chapterId);
			const nextDraft: CologChapterDraft = { id: chapterId, name };

			if (nextDraft.name === originalChapter.name) {
				return currentDrafts.filter((draft) => draft.id !== chapterId);
			}

			if (currentDraft === undefined) {
				return [...currentDrafts, nextDraft];
			}

			return currentDrafts.map((draft) => (draft.id === chapterId ? nextDraft : draft));
		});
	};

	const handleAddChapter = (name: string) => {
		setChapters((currentChapters) => [
			...currentChapters,
			{
				id: Math.max(0, ...currentChapters.map((chapter) => chapter.id)) + 1,
				name,
				postCount: 0,
			},
		]);
	};

	return {
		chapters,
		displayedChapters,
		draftChapters,
		isEditing,
		isDirty,
		isCreateModalOpen,
		setIsCreateModalOpen,
		handleStartEditing,
		handleCancelEditing,
		handleSave,
		handleNameChange,
		handleAddChapter,
	};
}
