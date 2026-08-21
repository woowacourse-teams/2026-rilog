import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery } from '@/test/render-with-query';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

const { logoutMock, mutateMock, pushMock } = vi.hoisted(() => ({
	logoutMock: vi.fn(),
	mutateMock: vi.fn(),
	pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/shared/api/auth/mutations/use-logout-mutation', () => ({
	useLogoutMutation: () => ({ mutate: mutateMock }),
}));

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
		<AUTH_CONTEXT.Provider
			value={{ isAuthenticated: true, isInitialized: true, setIsAuthenticated: vi.fn(), logout: logoutMock }}
		>
			<AuthenticatedSidebarFooter />
		</AUTH_CONTEXT.Provider>,
	);
}

describe('AuthenticatedSidebarFooter', () => {
	beforeEach(() => {
		logoutMock.mockReset();
		pushMock.mockReset();
		mutateMock.mockReset();
		mutateMock.mockImplementation((_value: undefined, options: { onSettled?: () => void }) => options.onSettled?.());
	});

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

	it('로그아웃 완료 후 메인 피드로 이동한다', async () => {
		const user = userEvent.setup();
		renderFooter();

		await user.click(screen.getByRole('button', { name: '로그아웃' }));

		expect(logoutMock).toHaveBeenCalledOnce();
		expect(pushMock).toHaveBeenCalledWith('/feeds');
	});
});
