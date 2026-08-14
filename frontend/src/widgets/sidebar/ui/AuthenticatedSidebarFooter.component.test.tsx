import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

describe('AuthenticatedSidebarFooter', () => {
	it('글쓰기, 프로필과 로그아웃 진입점을 제공한다', () => {
		render(<AuthenticatedSidebarFooter />);

		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
		expect(screen.getByRole('link', { name: '파라디 @JetProc' })).toHaveAttribute('href', '/profile');
		expect(screen.getByRole('link', { name: '로그아웃' })).toHaveAttribute('href', '/logout');
	});

	it('키보드로 푸터 링크를 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<AuthenticatedSidebarFooter />);

		await user.tab();
		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '파라디 @JetProc' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '로그아웃' })).toHaveFocus();
	});
});
