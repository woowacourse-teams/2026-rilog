import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import SidebarLayout from './layout';

describe('SidebarLayout', () => {
	it('사이드바, 모바일 헤더와 페이지 콘텐츠를 함께 조립한다', () => {
		render(
			<LoginModalProvider>
				<SidebarLayout>
					<main>페이지 콘텐츠</main>
				</SidebarLayout>
			</LoginModalProvider>,
		);

		expect(screen.getByRole('complementary', { name: '사이드바' }).parentElement).toHaveClass('hidden', 'sm:flex');

		const mobileHeader = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
		expect(mobileHeader).toHaveAttribute('data-mobile-header');
		expect(mobileHeader.parentElement).toHaveClass('sticky', 'sm:hidden');
		expect(screen.getByRole('main')).toHaveTextContent('페이지 콘텐츠');
	});
});
