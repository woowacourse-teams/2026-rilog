import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
	it('확인과 취소 action을 제공한다', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(
			<ConfirmModal
				open
				title="발행할까요?"
				description="발행 후 공개됩니다."
				confirmLabel="발행"
				onConfirm={onConfirm}
				onCancel={onCancel}
			/>,
		);

		expect(screen.getByRole('dialog', { name: '발행할까요?' })).toHaveAccessibleDescription('발행 후 공개됩니다.');
		await user.click(screen.getByRole('button', { name: '발행' }));
		await user.click(screen.getByRole('button', { name: '취소' }));
		expect(onConfirm).toHaveBeenCalledOnce();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('default variant는 확인 버튼에 초기 focus를 둔다', async () => {
		render(<ConfirmModal open title="계속할까요?" onConfirm={vi.fn()} onCancel={vi.fn()} />);

		await waitFor(() => expect(screen.getByRole('button', { name: '확인' })).toHaveFocus());
	});

	it('danger variant는 취소 버튼에 초기 focus를 둔다', async () => {
		render(
			<ConfirmModal
				open
				title="삭제할까요?"
				variant="danger"
				confirmLabel="삭제"
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>,
		);

		await waitFor(() => expect(screen.getByRole('button', { name: '취소' })).toHaveFocus());
	});

	it('null description은 accessible description으로 연결하지 않는다', () => {
		render(<ConfirmModal open title="확인" description={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);

		expect(screen.getByRole('dialog', { name: '확인' })).not.toHaveAttribute('aria-describedby');
	});

	it('pending 중 모든 action과 dismiss를 차단한다', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		const onCancel = vi.fn();
		render(<ConfirmModal open title="처리 중" isPending onConfirm={onConfirm} onCancel={onCancel} />);
		const dialog = screen.getByRole('dialog', { name: '처리 중' });

		expect(screen.getByRole('button', { name: '확인' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: '확인' }));
		await user.click(screen.getByRole('button', { name: '취소' }));
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('pending이 아니면 backdrop을 취소로 처리한다', () => {
		const onCancel = vi.fn();
		render(<ConfirmModal open title="닫기 확인" onConfirm={vi.fn()} onCancel={onCancel} />);
		const dialog = screen.getByRole('dialog', { name: '닫기 확인' });

		fireEvent.click(dialog);
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('pending이 아니면 Escape를 취소로 처리한다', () => {
		const onCancel = vi.fn();
		render(<ConfirmModal open title="닫기 확인" onConfirm={vi.fn()} onCancel={onCancel} />);
		const dialog = screen.getByRole('dialog', { name: '닫기 확인' });

		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
