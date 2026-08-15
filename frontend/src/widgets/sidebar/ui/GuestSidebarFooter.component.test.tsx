import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import GuestSidebarFooter from './GuestSidebarFooter';

describe('GuestSidebarFooter', () => {
	it('로그인 버튼을 누르면 로그인 모달을 연다', async () => {
		const user = userEvent.setup();
		render(
			<LoginModalProvider>
				<GuestSidebarFooter />
			</LoginModalProvider>,
		);

		const loginButton = screen.getByRole('button', { name: '로그인' });
		expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
		expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();

		await user.tab();
		expect(loginButton).toHaveFocus();

		await user.keyboard('{Enter}');
		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'GitHub로 계속하기' })).toHaveFocus();
	});
});
