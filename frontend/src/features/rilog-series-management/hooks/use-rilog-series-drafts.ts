'use client';

import { useEffect, useRef, useState } from 'react';

import type { RilogSeries } from '../model/rilog-series';

export type RilogSeriesDraft = Pick<RilogSeries, 'id' | 'name'>;

interface UseRilogSeriesDraftsOptions {
	initialSeries?: RilogSeries[];
}

export function useRilogSeriesDrafts({ initialSeries }: UseRilogSeriesDraftsOptions = {}) {
	const hasInitializedSeries = useRef(initialSeries !== undefined);
	// TODO: 시리즈 API 연동 시 state 대신 query 기반으로 변경
	const [series, setSeries] = useState(() => initialSeries?.map((item) => ({ ...item })) ?? []);
	const [draftSeries, setDraftSeries] = useState<RilogSeriesDraft[]>([]);
	const [isEditing, setIsEditing] = useState(false);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	useEffect(() => {
		if (initialSeries === undefined || hasInitializedSeries.current) {
			return;
		}

		setSeries(initialSeries.map((item) => ({ ...item })));
		hasInitializedSeries.current = true;
	}, [initialSeries]);

	const isDirty = draftSeries.length > 0;
	const displayedSeries = series.map((item) => {
		const draft = draftSeries.find((candidate) => candidate.id === item.id);
		return draft === undefined ? item : { ...item, ...draft };
	});

	const handleStartEditing = () => {
		setDraftSeries([]);
		setIsEditing(true);
	};

	const handleCancelEditing = () => {
		setDraftSeries([]);
		setIsEditing(false);
	};

	const handleSave = () => {
		setSeries((currentSeries) =>
			currentSeries.map((item) => {
				const draft = draftSeries.find((candidate) => candidate.id === item.id);
				return draft === undefined ? item : { ...item, ...draft };
			}),
		);
		setDraftSeries([]);
		setIsEditing(false);
	};

	const handleNameChange = (seriesId: number, name: string) => {
		const originalSeries = series.find((item) => item.id === seriesId);
		if (originalSeries === undefined) {
			return;
		}

		setDraftSeries((currentDrafts) => {
			const currentDraft = currentDrafts.find((draft) => draft.id === seriesId);
			const nextDraft: RilogSeriesDraft = { id: seriesId, name };

			if (nextDraft.name === originalSeries.name) {
				return currentDrafts.filter((draft) => draft.id !== seriesId);
			}

			if (currentDraft === undefined) {
				return [...currentDrafts, nextDraft];
			}

			return currentDrafts.map((draft) => (draft.id === seriesId ? nextDraft : draft));
		});
	};

	const handleCreateSeries = (name: string) => {
		setSeries((currentSeries) => [
			...currentSeries,
			{
				id: Math.max(0, ...currentSeries.map((item) => item.id)) + 1,
				name,
				postCount: 0,
			},
		]);
	};

	return {
		series,
		displayedSeries,
		draftSeries,
		isEditing,
		isDirty,
		isCreateModalOpen,
		setIsCreateModalOpen,
		handleStartEditing,
		handleCancelEditing,
		handleSave,
		handleNameChange,
		handleCreateSeries,
	};
}
