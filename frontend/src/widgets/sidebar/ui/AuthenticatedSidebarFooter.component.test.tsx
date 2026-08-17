import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

describe('AuthenticatedSidebarFooter', () => {
	it('글쓰기와 프로필 진입점, 로그아웃 버튼을 제공한다', () => {
		render(<AuthenticatedSidebarFooter />);

		const [writeLink, profileLink] = screen.getAllByRole('link');
		const logoutButton = screen.getByRole('button');

		expect(writeLink).toHaveAttribute('href', '/write');
		expect(profileLink).toHaveAttribute('href', '/@jetproc');
		expect(profileLink).toHaveAccessibleName();
		expect(logoutButton).toBeEnabled();
	});

	it('키보드로 푸터 링크와 로그아웃 버튼을 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<AuthenticatedSidebarFooter />);
		const [writeLink, profileLink] = screen.getAllByRole('link');
		const logoutButton = screen.getByRole('button');

		await user.tab();
		expect(writeLink).toHaveFocus();

		await user.tab();
		expect(profileLink).toHaveFocus();

		await user.tab();
		expect(logoutButton).toHaveFocus();
	});
});
