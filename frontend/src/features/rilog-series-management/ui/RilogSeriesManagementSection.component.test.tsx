import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Chapter } from '@/domains/chapter/model/chapter';
import type { useChapterManagement } from '@/features/chapter-management/hooks/use-chapter-management';

import RilogSeriesManagementSection from './RilogSeriesManagementSection';

const SERIES: Chapter[] = [
	{ id: 1, name: '웹 개발' },
	{ id: 2, name: '기록' },
];

const createManagement = (
	overrides: Partial<ReturnType<typeof useChapterManagement>> = {},
): ReturnType<typeof useChapterManagement> => ({
	chapters: SERIES,
	displayedChapters: SERIES,
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

describe('RilogSeriesManagementSection', () => {
	it('시리즈 목록을 렌더링하고 삭제 요청을 전달한다', async () => {
		const user = userEvent.setup();
		const requestChapterDelete = vi.fn();
		render(<RilogSeriesManagementSection management={createManagement({ requestChapterDelete })} />);

		expect(screen.getByRole('table', { name: '시리즈 목록' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '번호' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '시리즈' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '웹 개발 시리즈 삭제' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '기록 시리즈 삭제' })).toBeInTheDocument();
		const seriesRows = screen.getAllByRole('row').slice(1);
		expect(seriesRows[0]).toHaveTextContent('1');
		expect(seriesRows[1]).toHaveTextContent('2');

		await user.click(screen.getByRole('button', { name: '웹 개발 시리즈 삭제' }));
		expect(requestChapterDelete).toHaveBeenCalledWith(SERIES[0]);
	});

	it('삭제할 시리즈를 확인 모달에 표시한다', () => {
		render(<RilogSeriesManagementSection management={createManagement({ chapterToDelete: SERIES[0] })} />);

		expect(screen.getByRole('dialog', { name: '웹 개발 시리즈를 삭제할까요?' })).toBeInTheDocument();
		expect(screen.getByText(/시리즈는 삭제 후 복구할 수 없습니다/)).toBeInTheDocument();
		expect(screen.getByText(/포함된 게시글은 시리즈에서 분리되며 그대로 유지됩니다/)).toBeInTheDocument();
	});

	it('전달받은 상태에 따라 시리즈 추가 모달을 렌더링한다', () => {
		render(<RilogSeriesManagementSection management={createManagement({ isCreateModalOpen: true })} />);

		expect(screen.getByRole('dialog', { name: '시리즈 추가' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '시리즈 이름' })).toHaveAttribute('maxlength', '20');
	});

	it('챕터 개수 제한 오류를 시리즈 맥락의 프론트엔드 문구로 표시한다', () => {
		render(
			<RilogSeriesManagementSection
				management={createManagement({
					isCreateModalOpen: true,
					createError: {
						type: 'api',
						detail: {
							status: 400,
							error: 'BAD_REQUEST',
							errorCode: 'CHAPTER_COUNT_EXCEEDED',
							message: '챕터는 최대 30개까지 생성할 수 있습니다.',
							invalidParams: null,
						},
					} as unknown as Error,
				})}
			/>,
		);

		expect(screen.getByRole('alert')).toHaveTextContent('시리즈는 최대 30개까지 추가할 수 있습니다.');
		expect(screen.getByRole('alert')).not.toHaveTextContent('챕터는 최대 30개까지 생성할 수 있습니다.');
	});

	it('시리즈 이름 수정 입력을 20자로 제한한다', () => {
		render(<RilogSeriesManagementSection management={createManagement({ isEditing: true })} />);

		const input = screen.getByRole('textbox', { name: '웹 개발 시리즈 이름' });
		expect(input).toHaveAttribute('maxlength', '20');
		expect(input).toHaveAttribute('data-ph-sensitive-attribute');
	});

	it('조회 중 상태와 빈 상태를 렌더링한다', () => {
		const { rerender } = render(<RilogSeriesManagementSection management={createManagement({ isLoading: true })} />);
		expect(screen.getByRole('status')).toHaveTextContent('시리즈를 불러오는 중...');

		rerender(<RilogSeriesManagementSection management={createManagement({ chapters: [], displayedChapters: [] })} />);
		expect(screen.getByText('아직 등록된 시리즈가 없어요.')).toBeInTheDocument();
	});
});
