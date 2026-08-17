import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import MobileHeader from './MobileHeader';

const navigationMock = vi.hoisted(() => ({ pathname: '/feeds' }));

vi.mock('next/navigation', () => ({
	usePathname: () => navigationMock.pathname,
}));

function renderHeader(isAuthenticated = false) {
	return render(
		<LoginModalProvider>
			<MobileHeader isAuthenticated={isAuthenticated} />
		</LoginModalProvider>,
	);
}

describe('MobileHeader', () => {
	beforeEach(() => {
		navigationMock.pathname = '/feeds';
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
		navigationMock.pathname = '/posts/17';
		renderHeader(true);

		const feedLink = screen.getByRole('link', { name: 'Rilog.' });

		expect(feedLink).toHaveAttribute('href', '/feeds');
		expect(feedLink).toHaveAttribute('aria-current', 'page');
		expect(screen.getByText('P')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument();
	});
});
