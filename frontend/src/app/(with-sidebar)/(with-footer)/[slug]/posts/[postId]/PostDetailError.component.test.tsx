import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PostDetailError from './error';

const { trackerMock } = vi.hoisted(() => ({ trackerMock: vi.fn() }));

vi.mock('@/features/analytics/ui/ContentLoadFailureTracker', () => ({
	default: (props: unknown) => {
		trackerMock(props);
		return null;
	},
}));

describe('PostDetailError', () => {
	it('상세 조회 실패를 추적하고 재시도 동작을 제공한다', async () => {
		const user = userEvent.setup();
		const reset = vi.fn();
		const error = new Error('조회 실패');
		render(<PostDetailError error={error} reset={reset} />);

		expect(screen.getByRole('heading', { name: '게시글을 불러오지 못했어요.' })).toBeInTheDocument();
		expect(trackerMock).toHaveBeenCalledWith({ surface: 'post_detail', loadPhase: 'detail', error });
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(reset).toHaveBeenCalledOnce();
	});
});
