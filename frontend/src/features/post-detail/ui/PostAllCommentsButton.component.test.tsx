import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PostAllCommentsButton from './PostAllCommentsButton';

describe('PostAllCommentsButton', () => {
	it('전체 댓글 수를 시각적으로 표시하고 accessible name에 포함한다', () => {
		render(<PostAllCommentsButton commentCount={8} />);

		expect(screen.getByRole('button', { name: '전체 댓글 8개 보기' })).toBeInTheDocument();
		expect(screen.getByText('전체 보기')).toBeInTheDocument();
		expect(screen.getByText('8')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByRole('button', { name: '전체 댓글 8개 보기' }).querySelector('svg')).toHaveAttribute(
			'aria-hidden',
			'true',
		);
	});

	it('댓글이 99개를 넘으면 시각적으로 99+로 표시하고 accessible name에는 실제 수를 포함한다', () => {
		render(<PostAllCommentsButton commentCount={100} />);

		expect(screen.getByRole('button', { name: '전체 댓글 100개 보기' })).toBeInTheDocument();
		expect(screen.getByText('99+')).toHaveAttribute('aria-hidden', 'true');
	});

	it('클릭하면 전체 댓글 열기를 요청한다', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<PostAllCommentsButton commentCount={8} onClick={onClick} />);

		await user.click(screen.getByRole('button', { name: '전체 댓글 8개 보기' }));
		expect(onClick).toHaveBeenCalledOnce();
	});
});
