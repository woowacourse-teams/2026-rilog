import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ChapterCreateModal from './ChapterCreateModal';

describe('ChapterCreateModal', () => {
	it('챕터 이름 입력에 포커스된 상태로 열린다', () => {
		render(<ChapterCreateModal open onClose={vi.fn()} onCreate={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		expect(screen.getByRole('dialog', { name: '챕터 추가' })).toBeInTheDocument();
		expect(input).toHaveFocus();
	});

	it('취소하면 입력값을 초기화하고 닫기를 알린다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<ChapterCreateModal open onClose={onClose} onCreate={vi.fn()} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		await user.type(input, '프론트엔드');
		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(onClose).toHaveBeenCalledOnce();
		expect(input).toHaveValue('');
	});

	it('챕터 이름을 입력하면 추가를 활성화하고 정규화한 이름을 전달한다', async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn();
		render(<ChapterCreateModal open onClose={vi.fn()} onCreate={onAdd} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();

		await user.type(input, '  프론트엔드  ');
		await user.click(screen.getByRole('button', { name: '추가' }));

		expect(onAdd).toHaveBeenCalledWith('프론트엔드');
	});
});
