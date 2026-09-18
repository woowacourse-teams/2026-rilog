import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostAllCommentsButton from './PostAllCommentsButton';

describe('PostAllCommentsButton', () => {
	it('전체 댓글 수를 시각적으로 표시하고 accessible name에 포함한다', () => {
		render(<PostAllCommentsButton commentCount={8} />);

		expect(screen.getByRole('button', { name: '전체 댓글 8개 보기' })).toBeInTheDocument();
		expect(screen.getByText('전체 댓글')).toBeInTheDocument();
		expect(screen.getByText('8')).toHaveAttribute('aria-hidden', 'true');
		expect(document.querySelector('svg')).not.toBeInTheDocument();
	});
});
