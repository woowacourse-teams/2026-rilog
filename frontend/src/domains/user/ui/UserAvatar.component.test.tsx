import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
	it('사용자 이름을 제공하면 독립적인 이미지로 노출한다', () => {
		render(<UserAvatar fallback="R" label="Rilog 사용자" />);

		expect(screen.getByRole('img', { name: 'Rilog 사용자' })).toHaveTextContent('R');
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('slug를 제공하면 해당 개인 블로그로 이동하는 링크를 제공한다', () => {
		render(<UserAvatar fallback="R" label="Rilog 사용자" slug=" @rilog " />);

		const profileLink = screen.getByRole('link', { name: '@rilog 블로그로 이동' });
		expect(profileLink).toHaveAttribute('href', '/@rilog');
		expect(profileLink).toHaveClass('rounded-full', 'focus-visible:outline-2', 'focus-visible:outline-focus-ring');
		expect(screen.getByRole('img', { name: 'Rilog 사용자' })).toHaveTextContent('R');
	});

	it('빈 slug는 링크로 만들지 않는다', () => {
		render(<UserAvatar fallback="R" label="Rilog 사용자" slug=" @ " />);

		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
