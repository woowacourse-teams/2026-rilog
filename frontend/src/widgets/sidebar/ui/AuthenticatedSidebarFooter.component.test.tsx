import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery } from '@/test/render-with-query';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: vi.fn(({ select }) => {
		const response = {
			status: 200,
			message: 'OK',
			data: {
				id: 1,
				slug: 'jetproc',
				nickname: '파라디',
				profileImageUrl: null,
			},
		};
		return {
			data: select ? select(response) : response,
		};
	}),
}));

function renderFooter() {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, setIsAuthenticated: vi.fn(), logout: vi.fn() }}>
			<AuthenticatedSidebarFooter />
		</AUTH_CONTEXT.Provider>,
	);
}

describe('AuthenticatedSidebarFooter', () => {
	it('글쓰기와 프로필 진입점, 로그아웃 버튼을 제공한다', () => {
		renderFooter();

		const [writeLink, profileLink] = screen.getAllByRole('link');
		const logoutButton = screen.getByRole('button');

		expect(writeLink).toHaveAttribute('href', '/write');
		expect(profileLink).toHaveAttribute('href', '/@jetproc');
		expect(profileLink).toHaveAccessibleName();
		expect(logoutButton).toBeEnabled();
	});

	it('키보드로 푸터 링크와 로그아웃 버튼을 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		renderFooter();
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
