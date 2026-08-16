import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import MobileBottomNavigation from './MobileBottomNavigation';

const navigationMock = vi.hoisted(() => ({ pathname: '/feeds' }));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationMock.pathname,
}));

function renderNavigation(isAuthenticated = false) {
	return render(
		<LoginModalProvider>
			<MobileBottomNavigation isAuthenticated={isAuthenticated} />
		</LoginModalProvider>,
	);
}

describe('MobileBottomNavigation', () => {
	beforeEach(() => {
		navigationMock.pathname = '/feeds';
	});

	it('비로그인 사용자에게 피드와 글쓰기 링크 및 로그인 버튼을 제공한다', async () => {
		const user = userEvent.setup();
		renderNavigation();

		const navigation = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
		const feedLink = screen.getByRole('link', { name: '피드' });

		expect(navigation).toHaveClass('md:hidden');
		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
		expect(screen.queryByRole('link', { name: '프로필' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '로그인' }));
		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
	});

	it('로그인 사용자에게 프로필 링크를 제공하고 현재 위치를 표시한다', () => {
		navigationMock.pathname = '/profile';
		renderNavigation(true);

		const profileLink = screen.getByRole('link', { name: '프로필' });

		expect(profileLink).toHaveAttribute('href', '/profile');
		expect(profileLink).toHaveAttribute('aria-current', 'page');
		expect(profileLink.querySelector('[aria-hidden="true"]')).toHaveClass('size-6', 'rounded-full');
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
	});
});
