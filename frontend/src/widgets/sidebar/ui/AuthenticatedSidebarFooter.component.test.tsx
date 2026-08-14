import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

describe('AuthenticatedSidebarFooter', () => {
	it('글쓰기와 프로필 진입점, 로그아웃 버튼을 제공한다', () => {
		render(<AuthenticatedSidebarFooter />);

		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
		expect(screen.getByRole('link', { name: '파라디 @JetProc' })).toHaveAttribute('href', '/profile');
		expect(screen.getByRole('button', { name: '로그아웃' })).toBeEnabled();
	});

	it('키보드로 푸터 링크와 로그아웃 버튼을 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<AuthenticatedSidebarFooter />);

		await user.tab();
		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '파라디 @JetProc' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('button', { name: '로그아웃' })).toHaveFocus();
	});
});
