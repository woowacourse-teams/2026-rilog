import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import MobileHeader from './MobileHeader';

const { navigationMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	navigationMock: { pathname: '/feeds' },
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationMock.pathname,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

function renderHeader(isAuthenticated = false) {
	return render(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated, isInitialized: true }}>
			<LoginModalProvider>
				<MobileHeader />
			</LoginModalProvider>
		</AUTH_CONTEXT.Provider>,
	);
}

describe('MobileHeader', () => {
	beforeEach(() => {
		navigationMock.pathname = '/feeds';
		useMyInfoQueryMock.mockReset().mockReturnValue({ data: null });
	});

	it('비로그인 사용자에게 피드 링크와 로그인 버튼을 제공한다', async () => {
		const user = userEvent.setup();
		renderHeader();

		const navigation = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
		const feedLink = screen.getByRole('link', { name: 'Rilog.' });

		expect(navigation).toHaveAttribute('data-mobile-header');
		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '로그인' }));
		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
	});

	it('로그인 사용자에게 아바타를 표시하고 게시글에서도 피드 링크를 현재 위치로 표시한다', () => {
		navigationMock.pathname = '/@rilog/posts/17';
		useMyInfoQueryMock.mockReturnValue({
			data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
		});
		renderHeader(true);

		const feedLink = screen.getByRole('link', { name: 'Rilog.' });

		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '@e2e-user 블로그로 이동' })).toHaveAttribute('href', '/@e2e-user');
		expect(screen.getByRole('img', { name: 'E2E 사용자 프로필' })).toHaveTextContent('E');
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
	});

	it('내 정보 조회 전에는 fallback avatar를 링크 없이 표시한다', () => {
		renderHeader(true);

		expect(screen.getByRole('img', { name: '사용자 프로필' })).toHaveTextContent('P');
		expect(screen.queryByRole('link', { name: /블로그로 이동/ })).not.toBeInTheDocument();
	});
});
