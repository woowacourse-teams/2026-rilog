import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { useRilogSeriesDrafts } from '../hooks/use-rilog-series-drafts';
import type { RilogSeries } from '../model/rilog-series';

import RilogSeriesManagementSection from './RilogSeriesManagementSection';

const SERIES: RilogSeries[] = [
	{ id: 1, name: '웹 개발', postCount: 3 },
	{ id: 2, name: '기록', postCount: 7 },
];

const createDrafts = (isCreateModalOpen = false): ReturnType<typeof useRilogSeriesDrafts> => ({
	series: SERIES,
	displayedSeries: SERIES,
	draftSeries: [],
	isEditing: false,
	isDirty: false,
	isCreateModalOpen,
	setIsCreateModalOpen: vi.fn(),
	handleStartEditing: vi.fn(),
	handleCancelEditing: vi.fn(),
	handleSave: vi.fn(),
	handleNameChange: vi.fn(),
	handleCreateSeries: vi.fn(),
});

describe('RilogSeriesManagementSection', () => {
	it('시리즈 목록과 삭제 작업을 렌더링한다', () => {
		render(<RilogSeriesManagementSection drafts={createDrafts()} />);

		expect(screen.getByRole('table', { name: '시리즈 목록' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '시리즈' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '웹 개발 시리즈 삭제' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '기록 시리즈 삭제' })).toBeInTheDocument();
	});

	it('전달받은 상태에 따라 시리즈 추가 모달을 렌더링한다', () => {
		render(<RilogSeriesManagementSection drafts={createDrafts(true)} />);

		expect(screen.getByRole('dialog', { name: '시리즈 추가' })).toBeInTheDocument();
	});
});
