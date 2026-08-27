import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import GuestSidebarFooter from './GuestSidebarFooter';

const { githubLoginStartedMock } = vi.hoisted(() => ({ githubLoginStartedMock: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		githubLoginStarted: githubLoginStartedMock,
	},
}));

describe('GuestSidebarFooter', () => {
	beforeEach(() => {
		githubLoginStartedMock.mockReset();
		localStorage.clear();
		window.history.replaceState({}, '', '/feeds?tab=latest');
	});

	it('로그인 버튼을 누르면 로그인 모달을 연다', async () => {
		const user = userEvent.setup();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true }}>
				<LoginModalProvider>
					<GuestSidebarFooter />
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>,
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

	it('사이드바에서 시작한 GitHub 로그인에 진입면과 path-only redirect를 남긴다', async () => {
		const user = userEvent.setup();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true }}>
				<LoginModalProvider>
					<GuestSidebarFooter />
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>,
		);

		await user.click(screen.getByRole('button', { name: '로그인' }));
		await user.click(screen.getByRole('button', { name: 'GitHub로 계속하기' }));

		expect(githubLoginStartedMock).toHaveBeenCalledWith({
			entrySurface: 'sidebar',
			redirectTarget: '/feeds',
		});
		expect(localStorage.getItem('postLoginRedirect')).toBe('/feeds');
	});
});
