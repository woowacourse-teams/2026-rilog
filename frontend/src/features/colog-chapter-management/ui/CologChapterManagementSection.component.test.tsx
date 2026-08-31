import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CologChapter } from '../model/colog-chapter';

import CologChapterManagementSection from './CologChapterManagementSection';

const CHAPTERS: CologChapter[] = [
	{ id: 1, name: '프론트엔드', postCount: 3 },
	{ id: 2, name: '백엔드', postCount: 7 },
];

describe('CologChapterManagementSection', () => {
	it('챕터 목록과 삭제 작업을 렌더링한다', () => {
		render(<CologChapterManagementSection chapters={CHAPTERS} onDeleteChapter={vi.fn()} />);

		expect(screen.getByRole('table', { name: '팀 챕터 목록' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '챕터' })).toBeInTheDocument();
		expect(screen.getByRole('columnheader', { name: '게시글 수' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '프론트엔드 챕터 삭제' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '백엔드 챕터 삭제' })).toBeInTheDocument();
	});

	it('전달받은 상태에 따라 챕터 추가 모달을 렌더링한다', () => {
		render(
			<CologChapterManagementSection
				chapters={CHAPTERS}
				isCreateModalOpen
				onCloseCreateModal={vi.fn()}
				onCreateChapter={vi.fn()}
			/>,
		);

		expect(screen.getByRole('dialog', { name: '챕터 추가' })).toBeInTheDocument();
	});
});
