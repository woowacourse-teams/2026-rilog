import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import GuestSidebarFooter from './GuestSidebarFooter';

describe('GuestSidebarFooter', () => {
	it('키보드로 접근할 수 있는 로그인 링크를 제공한다', async () => {
		const user = userEvent.setup();
		render(<GuestSidebarFooter />);

		const loginLink = screen.getByRole('link');
		expect(loginLink).toHaveAttribute('href', '/login');

		await user.tab();
		expect(loginLink).toHaveFocus();
	});
});
