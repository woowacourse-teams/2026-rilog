import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ImageResetOverlay from './ImageResetOverlay';

describe('ImageResetOverlay', () => {
	it('접근 가능한 중앙 제거 action으로 기본 이미지를 복원한다', async () => {
		const user = userEvent.setup();
		const onReset = vi.fn();
		render(<ImageResetOverlay imageLabel="팀 로고" onReset={onReset} />);

		const resetButton = screen.getByRole('button', { name: '팀 로고 기본 이미지로 되돌리기' });
		expect(resetButton).toHaveClass('top-1/2', 'left-1/2', 'sm:group-hover:opacity-100');
		await user.click(resetButton);

		expect(onReset).toHaveBeenCalledOnce();
	});
});
