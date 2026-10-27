import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import * as authApi from '@/shared/api/auth/api';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { renderWithQuery } from '@/test/render-with-query';

import MobileHeader from './MobileHeader';

const { navigationMock, useMyInfoQueryMock, unreadCountQuery, publishLogoutMock } = vi.hoisted(() => ({
	navigationMock: { pathname: '/feeds' },
	publishLogoutMock: vi.fn<() => Promise<void>>(),
	useMyInfoQueryMock: vi.fn(),
	unreadCountQuery: { current: 0 },
}));

vi.mock('@/shared/api/notifications/queries/unread-count/use-query', () => ({
	useNotificationUnreadCountQuery: () => ({ data: { data: { unreadCount: unreadCountQuery.current } } }),
}));

const { githubLoginStartedMock } = vi.hoisted(() => ({
	githubLoginStartedMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationMock.pathname,
}));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		githubLoginStarted: githubLoginStartedMock,
	},
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

function renderHeader(isAuthenticated = false) {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isOnboarding: false, isAuthenticated, sessionVersion: 0, isInitialized: true }}>
			<LoginModalProvider>
				<MobileHeader />
			</LoginModalProvider>
		</AUTH_CONTEXT.Provider>,
	);
}

describe('MobileHeader', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(authApi, 'logoutAuth').mockResolvedValue(new Response(null, { status: 204 }));
		publishLogoutMock.mockReset().mockResolvedValue();
		vi.spyOn(tokenManager, 'publishLogout').mockImplementation(publishLogoutMock);
		githubLoginStartedMock.mockReset();
		localStorage.clear();
		navigationMock.pathname = '/feeds';
		window.history.replaceState({}, '', '/feeds?tab=latest');
		useMyInfoQueryMock.mockReset().mockReturnValue({ data: null });
		unreadCountQuery.current = 0;
	});

	it('로그인 사용자의 읽지 않은 알림 수를 알림 링크에 표시한다', () => {
		unreadCountQuery.current = 2;
		renderHeader(true);

		expect(screen.getByRole('link', { name: '알림, 읽지 않은 알림 2개' })).toHaveAttribute('href', '/notifications');
	});

	it('비로그인 사용자에게 피드 링크와 로그인 버튼을 제공한다', async () => {
		const user = userEvent.setup();
		renderHeader();

		const navigation = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
		const feedLink = screen.getByRole('link', { name: 'Rilog.' });

		expect(navigation).toHaveAttribute('data-mobile-header');
		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: 'The Rilog.' })).toHaveAttribute('href', '/the-rilog');
		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '로그인' }));
		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
	});

	it('The Rilog.에서 매거진 진입점만 현재 위치로 표시한다', () => {
		navigationMock.pathname = '/the-rilog';
		renderHeader();

		expect(screen.getByRole('link', { name: 'The Rilog.' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: 'Rilog.' })).not.toHaveAttribute('aria-current');
	});

	it('매거진의 하위 페이지에서도 진입점을 현재 위치로 표시한다', () => {
		navigationMock.pathname = '/the-rilog/articles/123';
		renderHeader();

		expect(screen.getByRole('link', { name: 'The Rilog.' })).toHaveAttribute('aria-current', 'page');
	});

	it('모바일 헤더에서 시작한 GitHub 로그인에 진입면과 검색 조건을 포함한 복귀 경로를 남긴다', async () => {
		const user = userEvent.setup();
		renderHeader();

		await user.click(screen.getByRole('button', { name: '로그인' }));
		await user.click(screen.getByRole('button', { name: 'GitHub로 계속하기' }));

		expect(githubLoginStartedMock).toHaveBeenCalledWith({
			entrySurface: 'mobile_header',
			redirectTarget: '/feeds',
		});
		expect(localStorage.getItem('postLoginRedirect')).toBe('/feeds?tab=latest');
	});

	it('로그인 사용자가 프로필 메뉴를 열면 내 블로그 이동과 로그아웃을 제공한다', async () => {
		const user = userEvent.setup();
		navigationMock.pathname = '/@rilog/posts/17';
		useMyInfoQueryMock.mockReturnValue({
			data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
		});
		renderHeader(true);

		const feedLink = screen.getByRole('link', { name: 'Rilog.' });

		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));
		expect(screen.getByRole('menuitem', { name: '내 블로그' })).toHaveAttribute('href', '/@e2e-user');
		expect(screen.getByRole('menuitem', { name: '로그아웃' })).toBeVisible();
		expect(screen.getByRole('link', { name: '알림' })).toHaveAttribute('href', '/notifications');
		expect(screen.getByRole('img', { name: 'E2E 사용자 프로필' })).toHaveTextContent('E');
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
	});

	it('내 정보 조회 전에도 프로필 메뉴에서 로그아웃할 수 있다', async () => {
		const user = userEvent.setup();
		renderHeader(true);

		expect(screen.getByRole('img', { name: '사용자 프로필' })).toHaveTextContent('P');
		await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));
		expect(screen.queryByRole('menuitem', { name: '내 블로그' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('menuitem', { name: '로그아웃' }));
		await waitFor(() => expect(publishLogoutMock).toHaveBeenCalledOnce());
	});

	it('키보드로 메뉴를 탐색하고 Escape로 닫으면 프로필 버튼으로 돌아온다', async () => {
		const user = userEvent.setup();
		useMyInfoQueryMock.mockReturnValue({
			data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
		});
		renderHeader(true);
		const trigger = screen.getByRole('button', { name: '프로필 메뉴' });
		trigger.focus();
		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(screen.getByRole('menuitem', { name: '내 블로그' })).toHaveFocus());
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitem', { name: '로그아웃' })).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('열린 메뉴에서 Shift+Tab으로 트리거에 돌아온 뒤 Escape로 닫을 수 있다', async () => {
		const user = userEvent.setup();
		renderHeader(true);
		const trigger = screen.getByRole('button', { name: '프로필 메뉴' });
		await user.click(trigger);
		await user.tab({ shift: true });
		expect(trigger).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('열린 메뉴의 트리거에서도 방향키로 첫 항목과 마지막 항목에 다시 진입한다', async () => {
		const user = userEvent.setup();
		useMyInfoQueryMock.mockReturnValue({
			data: { id: 1, slug: 'e2e-user', nickname: 'E2E 사용자', profileImageUrl: null },
		});
		renderHeader(true);
		const trigger = screen.getByRole('button', { name: '프로필 메뉴' });
		await user.click(trigger);
		await user.tab({ shift: true });
		await user.keyboard('{ArrowUp}');
		expect(screen.getByRole('menuitem', { name: '로그아웃' })).toHaveFocus();
		await user.keyboard('{Home}');
		await user.tab({ shift: true });
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitem', { name: '내 블로그' })).toHaveFocus();
	});

	it('메뉴 바깥을 누르면 닫히고 Tab으로 벗어나도 닫힌다', async () => {
		const user = userEvent.setup();
		renderHeader(true);
		const trigger = screen.getByRole('button', { name: '프로필 메뉴' });
		await user.click(trigger);
		await user.click(screen.getByRole('navigation', { name: '모바일 주요 메뉴' }));
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		await user.click(trigger);
		await user.tab();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('로그아웃 요청이 실패해도 기존 정책대로 로컬 로그아웃을 실행한다', async () => {
		const user = userEvent.setup();
		vi.mocked(authApi.logoutAuth).mockRejectedValue(new Error('network unavailable'));
		renderHeader(true);
		await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));
		await user.click(screen.getByRole('menuitem', { name: '로그아웃' }));
		await waitFor(() => expect(publishLogoutMock).toHaveBeenCalledOnce());
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});
});
