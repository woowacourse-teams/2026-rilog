import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import SidebarLayout from './layout';

describe('SidebarLayout', () => {
	it('로그인 사이드바와 페이지 콘텐츠를 함께 조립한다', () => {
		render(
			<LoginModalProvider>
				<SidebarLayout>
					<main>페이지 콘텐츠</main>
				</SidebarLayout>
			</LoginModalProvider>,
		);

		expect(screen.getByRole('complementary', { name: '사이드바' })).toBeInTheDocument();
		expect(screen.getByRole('main')).toHaveTextContent('페이지 콘텐츠');
	});
});
