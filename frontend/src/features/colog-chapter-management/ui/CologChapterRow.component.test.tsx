import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CologChapter } from '../model/colog-chapter';

import CologChapterRow from './CologChapterRow';

const CHAPTER: CologChapter = {
	id: 1,
	name: '프론트엔드',
	postCount: 3,
};

const renderInTable = (ui: React.ReactElement) =>
	render(
		<table>
			<tbody>{ui}</tbody>
		</table>,
	);

describe('CologChapterRow', () => {
	it('챕터 이름과 게시글 수, 삭제 버튼을 렌더링한다', () => {
		renderInTable(<CologChapterRow chapter={CHAPTER} />);

		expect(screen.getByText('프론트엔드')).toBeInTheDocument();
		expect(screen.getByText('3개')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '프론트엔드 챕터 삭제' })).toBeInTheDocument();
	});

	it('삭제 버튼을 누르면 선택한 챕터를 전달한다', async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		renderInTable(<CologChapterRow chapter={CHAPTER} onDelete={onDelete} />);

		await user.click(screen.getByRole('button', { name: '프론트엔드 챕터 삭제' }));

		expect(onDelete).toHaveBeenCalledWith(CHAPTER);
	});

	it('편집 모드에서는 이름 입력을 표시하고 삭제 버튼은 숨긴다', () => {
		const onNameChange = vi.fn();
		renderInTable(<CologChapterRow chapter={CHAPTER} isEditing onNameChange={onNameChange} />);

		const input = screen.getByRole('textbox', { name: '프론트엔드 챕터 이름' });
		fireEvent.change(input, { target: { value: '프론트엔드 팀' } });

		expect(onNameChange).toHaveBeenCalledWith(1, '프론트엔드 팀');
		expect(screen.queryByRole('button', { name: '프론트엔드 챕터 삭제' })).not.toBeInTheDocument();
	});
});
