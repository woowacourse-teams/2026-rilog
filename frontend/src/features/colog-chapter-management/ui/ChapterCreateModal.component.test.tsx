import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ChapterCreateModal from './ChapterCreateModal';

describe('ChapterCreateModal', () => {
	it('챕터 이름 입력에 포커스된 상태로 열린다', () => {
		render(<ChapterCreateModal open onClose={vi.fn()} onCreate={vi.fn().mockResolvedValue(undefined)} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		expect(screen.getByRole('dialog', { name: '챕터 추가' })).toBeInTheDocument();
		expect(input).toHaveFocus();
	});

	it('취소하면 입력값을 초기화하고 닫기를 알린다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<ChapterCreateModal open onClose={onClose} onCreate={vi.fn().mockResolvedValue(undefined)} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		await user.type(input, '프론트엔드');
		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(onClose).toHaveBeenCalledOnce();
		expect(input).toHaveValue('');
	});

	it('챕터 이름을 입력하면 추가를 활성화하고 정규화한 이름을 전달한다', async () => {
		const user = userEvent.setup();
		const onAdd = vi.fn().mockResolvedValue(undefined);
		render(<ChapterCreateModal open onClose={vi.fn()} onCreate={onAdd} />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();

		await user.type(input, '  프론트엔드  ');
		await user.click(screen.getByRole('button', { name: '추가' }));

		expect(onAdd).toHaveBeenCalledWith('프론트엔드');
	});

	it('추가에 실패하면 입력값과 오류를 유지한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onCreate = vi.fn().mockRejectedValue(new Error('추가 실패'));
		render(<ChapterCreateModal open onClose={onClose} onCreate={onCreate} errorMessage="챕터를 추가하지 못했어요." />);

		const input = screen.getByRole('textbox', { name: '챕터 이름' });
		await user.type(input, '프론트엔드');
		await user.click(screen.getByRole('button', { name: '추가' }));

		expect(input).toHaveValue('프론트엔드');
		expect(screen.getByRole('alert')).toHaveTextContent('챕터를 추가하지 못했어요.');
		expect(onClose).not.toHaveBeenCalled();
	});
});
