import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AlertModal from './AlertModal';

describe('AlertModal', () => {
	it('alertdialog과 단일 확인 action을 제공한다', async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();
		const onClose = vi.fn();
		render(
			<AlertModal
				open
				title="저장 완료"
				description="게시글이 저장되었습니다."
				onAction={onAction}
				onClose={onClose}
			/>,
		);

		const dialog = screen.getByRole('alertdialog', { name: '저장 완료' });
		expect(dialog).toHaveAccessibleDescription('게시글이 저장되었습니다.');
		expect(screen.getAllByRole('button')).toHaveLength(1);
		await waitFor(() => expect(screen.getByRole('button', { name: '확인' })).toHaveFocus());

		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(onAction).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('null description은 accessible description으로 연결하지 않는다', () => {
		render(<AlertModal open title="알림" description={null} onAction={vi.fn()} onClose={vi.fn()} />);

		expect(screen.getByRole('alertdialog', { name: '알림' })).not.toHaveAttribute('aria-describedby');
	});

	it('backdrop은 닫기만 실행한다', () => {
		const onAction = vi.fn();
		const onClose = vi.fn();
		render(<AlertModal open title="알림" onAction={onAction} onClose={onClose} />);
		const dialog = screen.getByRole('alertdialog', { name: '알림' });

		fireEvent.click(dialog);
		expect(onClose).toHaveBeenCalledOnce();
		expect(onAction).not.toHaveBeenCalled();
	});

	it('Escape는 닫기만 실행한다', () => {
		const onAction = vi.fn();
		const onClose = vi.fn();
		render(<AlertModal open title="알림" onAction={onAction} onClose={onClose} />);
		const dialog = screen.getByRole('alertdialog', { name: '알림' });

		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledOnce();
		expect(onAction).not.toHaveBeenCalled();
	});
});
