'use client';

import { useEffect, useRef, useState } from 'react';

import type { Chapter } from '../model/chapter';

export type ChapterDraft = Pick<Chapter, 'id' | 'name'>;

interface UseChapterDraftsOptions {
	initialChapters?: Chapter[];
}

const isEqualChapter = (left: Chapter[] | undefined, right: Chapter[]) =>
	left !== undefined &&
	left.length === right.length &&
	left.every(
		(chapter, index) =>
			chapter.id === right[index].id &&
			chapter.name === right[index].name &&
			chapter.postCount === right[index].postCount,
	);

export function useChapterDrafts({ initialChapters }: UseChapterDraftsOptions = {}) {
	const lastSyncedChapters = useRef(initialChapters);
	const [chapters, setChapters] = useState(() => initialChapters?.map((chapter) => ({ ...chapter })) ?? []);
	const [draftChapters, setDraftChapters] = useState<ChapterDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	useEffect(() => {
		if (initialChapters === undefined || isEqualChapter(lastSyncedChapters.current, initialChapters) || isEditing) {
			return;
		}

		setChapters(initialChapters.map((chapter) => ({ ...chapter })));
		lastSyncedChapters.current = initialChapters;
	}, [initialChapters, isEditing]);

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

	const handleSaveChapters = (savedChapterIds: number[]) => {
		const savedChapterIdSet = new Set(savedChapterIds);
		const savedDrafts = draftChapters.filter((draft) => savedChapterIdSet.has(draft.id));

		if (savedDrafts.some((draft) => draft.name.trim().length === 0)) {
			return;
		}

		setChapters((currentChapters) =>
			currentChapters.map((chapter) => {
				const draftChapter = savedDrafts.find((draft) => draft.id === chapter.id);
				return draftChapter === undefined ? chapter : { ...chapter, ...draftChapter, name: draftChapter.name.trim() };
			}),
		);

		const remainingDrafts = draftChapters.filter((draft) => !savedChapterIdSet.has(draft.id));
		setDraftChapters(remainingDrafts);
		if (remainingDrafts.length === 0) {
			setIsEditing(false);
		}
	};

	const handleSave = () => {
		handleSaveChapters(draftChapters.map((draft) => draft.id));
	};

	const handleNameChange = (chapterId: number, name: string) => {
		const originalChapter = chapters.find((chapter) => chapter.id === chapterId);
		if (originalChapter === undefined) {
			return;
		}

		setDraftChapters((currentDrafts) => {
			const currentDraft = currentDrafts.find((draft) => draft.id === chapterId);
			const nextDraft: ChapterDraft = { id: chapterId, name };

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
		handleSaveChapters,
		handleNameChange,
		handleAddChapter,
	};
}
