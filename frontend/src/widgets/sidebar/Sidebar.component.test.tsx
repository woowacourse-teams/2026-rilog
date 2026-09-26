import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type * as NextNavigation from 'next/navigation';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import { renderWithQuery } from '@/test/render-with-query';

import Sidebar from './Sidebar';

vi.mock('next/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof NextNavigation>()),
	usePathname: () => '/feeds',
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/api/users/queries/my-cologs-overview/use-query', () => ({
	useMyCologsOverviewQuery: vi.fn(() => ({
		data: [],
		isPending: false,
	})),
}));

function renderSidebar(isAuthenticated = false) {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isOnboarding: false, isAuthenticated, isInitialized: true }}>
			<LoginModalProvider>
				<Sidebar />
			</LoginModalProvider>
		</AUTH_CONTEXT.Provider>,
	);
}

describe('Sidebar', () => {
	it('스크롤 영역 뒤와 인증 푸터 앞에 소개와 이메일 링크를 순서대로 둔다', async () => {
		const user = userEvent.setup();
		renderSidebar(false);

		const sidebar = screen.getByRole('complementary', { name: '사이드바' });
		const infoNavigation = within(sidebar).getByRole('navigation', { name: 'Rilog 정보' });
		const [aboutLink, emailLink] = within(infoNavigation).getAllByRole('link');
		const loginButton = within(sidebar).getByRole('button', { name: '로그인' });

		expect([aboutLink.textContent, emailLink.textContent]).toEqual(['Rilog 이야기 ↗', 'rilog.admin@gmail.com']);
		expect(aboutLink).toHaveAttribute('href', '/about');
		expect(aboutLink).toHaveAttribute('target', '_blank');
		expect(emailLink).toHaveAttribute('href', 'mailto:rilog.admin@gmail.com');
		expect(infoNavigation.compareDocumentPosition(loginButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

		aboutLink.focus();
		await user.tab();
		expect(emailLink).toHaveFocus();
		await user.tab();
		expect(loginButton).toHaveFocus();
	});

	it('로그인 사용자용 코로그 탐색과 푸터를 조립한다', () => {
		renderSidebar(true);

		expect(screen.getByRole('navigation', { name: '내 팀' })).toBeInTheDocument();
		expect(screen.getByRole('separator')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '글쓰기' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
		const infoNavigation = screen.getByRole('navigation', { name: 'Rilog 정보' });
		const writeLink = screen.getByRole('link', { name: '글쓰기' });
		expect(infoNavigation.compareDocumentPosition(writeLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('비로그인 사용자용 푸터를 조립하고 코로그 탐색을 제외한다', () => {
		renderSidebar(false);

		expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
		expect(screen.queryByRole('separator')).not.toBeInTheDocument();
		expect(screen.queryByRole('navigation', { name: '내 팀' })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument();
	});
});
