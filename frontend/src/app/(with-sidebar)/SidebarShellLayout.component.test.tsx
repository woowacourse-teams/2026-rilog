import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import SidebarLayout from './layout';

describe('SidebarLayout', () => {
	it('사이드바, 모바일 헤더와 페이지 콘텐츠를 함께 조립한다', () => {
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true }}>
				<LoginModalProvider>
					<SidebarLayout>
						<main>페이지 콘텐츠</main>
					</SidebarLayout>
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>,
		);

		expect(screen.getByRole('complementary', { name: '사이드바' }).parentElement).toHaveClass('hidden', 'sm:flex');

		const mobileHeader = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
		expect(mobileHeader).toHaveAttribute('data-mobile-header');
		expect(mobileHeader.parentElement).toHaveClass('sticky', 'sm:hidden');
		expect(screen.getByRole('main')).toHaveTextContent('페이지 콘텐츠');
	});
});
