import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { useChapterManagement } from '@/features/chapter-management/hooks/use-chapter-management';
import type { Chapter } from '@/features/chapter-management/model/chapter';

import CologChapterManagementSection from './CologChapterManagementSection';

const CHAPTERS: Chapter[] = [
	{ id: 1, name: '프론트엔드', postCount: 3 },
	{ id: 2, name: '백엔드', postCount: 7 },
];

const createManagement = (
	overrides: Partial<ReturnType<typeof useChapterManagement>> = {},
): ReturnType<typeof useChapterManagement> => ({
	chapters: CHAPTERS,
	displayedChapters: CHAPTERS,
	draftChapters: [],
	isEditing: false,
	isDirty: false,
	isCreateModalOpen: false,
	setIsCreateModalOpen: vi.fn(),
	handleStartEditing: vi.fn(),
	handleCancelEditing: vi.fn(),
	handleSave: vi.fn(),
	handleSaveChapters: vi.fn(),
	handleNameChange: vi.fn(),
	handleAddChapter: vi.fn().mockResolvedValue(undefined),
	isLoading: false,
	isLoadError: false,
	loadError: null,
	refetch: vi.fn(),
	isCreating: false,
	createError: null,
	resetCreateError: vi.fn(),
	isSaving: false,
	saveError: null,
	chapterToDelete: null,
	requestChapterDelete: vi.fn(),
	cancelChapterDelete: vi.fn(),
	confirmChapterDelete: vi.fn().mockResolvedValue(undefined),
	isDeletingChapter: false,
	chapterDeleteError: null,
	...overrides,
});

describe('CologChapterManagementSection', () => {
	it('챕터 목록을 렌더링하고 삭제 요청을 전달한다', async () => {
		const user = userEvent.setup();
		const requestChapterDelete = vi.fn();
		render(<CologChapterManagementSection management={createManagement({ requestChapterDelete })} />);

		expect(screen.getByRole('table', { name: '팀 챕터 목록' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '챕터' })).toBeInTheDocument();
		expect(screen.queryByRole('columnheader', { name: '게시글 수' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '프론트엔드 챕터 삭제' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '백엔드 챕터 삭제' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '프론트엔드 챕터 삭제' }));
		expect(requestChapterDelete).toHaveBeenCalledWith(CHAPTERS[0]);
	});

	it('삭제할 챕터와 삭제 실패 오류를 확인 모달에 표시한다', () => {
		render(
			<CologChapterManagementSection
				management={createManagement({
					chapterToDelete: CHAPTERS[0],
					chapterDeleteError: new Error('삭제 실패'),
				})}
			/>,
		);

		expect(screen.getByRole('dialog', { name: '프론트엔드 챕터를 삭제할까요?' })).toBeInTheDocument();
		expect(screen.getByText(/챕터는 삭제 후 복구할 수 없습니다/)).toBeInTheDocument();
		expect(screen.getByText(/포함된 게시글은 챕터에서 분리되며 그대로 유지됩니다/)).toBeInTheDocument();
		expect(screen.getByRole('alert')).toHaveTextContent('삭제 실패');
	});

	it('전달받은 상태에 따라 챕터 추가 모달을 렌더링한다', () => {
		render(<CologChapterManagementSection management={createManagement({ isCreateModalOpen: true })} />);

		expect(screen.getByRole('dialog', { name: '챕터 추가' })).toBeInTheDocument();
	});

	it('조회 중 상태와 조회 실패 재시도를 렌더링한다', () => {
		const { rerender } = render(<CologChapterManagementSection management={createManagement({ isLoading: true })} />);
		expect(screen.getByRole('status')).toHaveTextContent('챕터를 불러오는 중...');

		const refetch = vi.fn();
		rerender(<CologChapterManagementSection management={createManagement({ isLoadError: true, refetch })} />);
		expect(screen.getByRole('alert')).toHaveTextContent('챕터를 불러오지 못했어요.');
	});

	it('챕터가 없으면 빈 상태를 렌더링한다', () => {
		render(<CologChapterManagementSection management={createManagement({ chapters: [], displayedChapters: [] })} />);

		expect(screen.getByText('아직 등록된 챕터가 없어요.')).toBeInTheDocument();
	});
});
