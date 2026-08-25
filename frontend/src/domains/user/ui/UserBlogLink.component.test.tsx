import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserAvatar from './UserAvatar';
import UserBlogLink from './UserBlogLink';

describe('UserBlogLink', () => {
	it('slug를 제공하면 해당 개인 블로그로 이동하는 링크를 제공한다', () => {
		render(
			<UserBlogLink slug=" @rilog ">
				<UserAvatar fallback="R" label="Rilog 사용자" />
			</UserBlogLink>,
		);

		const profileLink = screen.getByRole('link', { name: '@rilog 블로그로 이동' });
		expect(profileLink).toHaveAttribute('href', '/@rilog');
		expect(profileLink).toHaveClass('rounded-full', 'focus-visible:outline-2', 'focus-visible:outline-focus-ring');
		expect(screen.getByRole('img', { name: 'Rilog 사용자' })).toHaveTextContent('R');
	});
});
