import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import { renderWithQuery } from '@/test/render-with-query';

import Sidebar from './Sidebar';

vi.mock('@/shared/api/users/queries/my-cologs-overview/use-query', () => ({
	useMyCologsOverviewQuery: vi.fn(() => ({
		data: [],
		isPending: false,
	})),
}));

function renderSidebar(isAuthenticated = false) {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated, isInitialized: true }}>
			<LoginModalProvider>
				<Sidebar />
			</LoginModalProvider>
		</AUTH_CONTEXT.Provider>,
	);
}

describe('Sidebar', () => {
	it('기본 접힘 상태에서 hover 시 펼쳐지고 focus 후에는 너비를 고정하지 않는다', () => {
		renderSidebar(true);

		const sidebar = screen.getByRole('complementary', { name: '사이드바' });
		expect(sidebar).toHaveClass('w-17.5', 'hover:w-60');
		expect(sidebar).not.toHaveClass('focus-within:w-60');
	});

	it('로그인 사용자용 코로그 탐색과 푸터를 조립한다', () => {
		renderSidebar(true);

		expect(screen.getByRole('navigation', { name: '내 팀' })).toBeInTheDocument();
		expect(screen.getByRole('separator')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '글쓰기' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
	});

	it('비로그인 사용자용 푸터를 조립하고 코로그 탐색을 제외한다', () => {
		renderSidebar(false);

		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
		expect(screen.queryByRole('separator')).not.toBeInTheDocument();
		expect(screen.queryByRole('navigation', { name: '내 팀' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument();
	});
});
