import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BottomSheet from './BottomSheet';

describe('BottomSheet', () => {
	it('title을 accessible name으로 연결하고 초기 focus를 둔다', () => {
		render(
			<BottomSheet open title="인덱스" onClose={vi.fn()}>
				<p>탐색 내용</p>
			</BottomSheet>,
		);

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		expect(dialog).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '인덱스' })).toHaveFocus();
	});

	it('닫기 버튼, backdrop과 Escape로 닫기를 요청한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(
			<BottomSheet open title="인덱스" closeButtonLabel="인덱스 닫기" onClose={onClose}>
				<p>탐색 내용</p>
			</BottomSheet>,
		);

		const dialog = screen.getByRole('dialog', { name: '인덱스' });
		await user.click(screen.getByRole('button', { name: '인덱스 닫기' }));
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));

		expect(onClose).toHaveBeenCalledTimes(3);
	});
});
