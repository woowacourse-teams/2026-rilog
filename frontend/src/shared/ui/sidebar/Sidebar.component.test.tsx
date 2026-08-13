import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import Sidebar from './Sidebar';

describe('Sidebar', () => {
	it('기본 접힘 상태에서 hover와 focus 진입 시 펼쳐진다', () => {
		render(<Sidebar isAuthenticated />);

		expect(screen.getByRole('complementary', { name: '사이드바' })).toHaveClass(
			'w-17.5',
			'hover:w-60',
			'focus-within:w-60',
		);
	});

	it('로그인 사용자의 피드 탐색과 Co-log 바로가기를 제공한다', () => {
		render(<Sidebar isAuthenticated />);

		const sidebar = screen.getByRole('complementary', { name: '사이드바' });
		expect(within(sidebar).getByRole('link', { name: 'Rilog 메인으로 이동' })).toBeInTheDocument();
		expect(within(sidebar).getByRole('link', { name: '피드 132' })).toHaveAttribute('aria-current', 'page');
		expect(within(sidebar).getByRole('navigation', { name: '내 Co-log' })).toBeInTheDocument();
		expect(within(sidebar).getByRole('link', { name: '글쓰기' })).toBeInTheDocument();
		expect(within(sidebar).getByRole('link', { name: '파라디 @JetProc' })).toBeInTheDocument();
		expect(within(sidebar).getByRole('link', { name: '로그아웃' })).toBeInTheDocument();
	});

	it('비로그인 사용자에게 피드와 로그인 진입점만 제공한다', () => {
		render(<Sidebar isAuthenticated={false} />);

		const sidebar = screen.getByRole('complementary', { name: '사이드바' });
		expect(within(sidebar).getByRole('link', { name: 'Rilog 메인으로 이동' })).toBeInTheDocument();
		expect(within(sidebar).getByRole('link', { name: '피드' })).toHaveAttribute('aria-current', 'page');
		expect(within(sidebar).getByRole('link', { name: '로그인' })).toBeInTheDocument();
		expect(within(sidebar).queryByRole('navigation', { name: '내 Co-log' })).not.toBeInTheDocument();
		expect(within(sidebar).queryByRole('link', { name: '글쓰기' })).not.toBeInTheDocument();
	});

	it('비로그인 사이드바를 키보드로 순차 탐색할 수 있다', async () => {
		const user = userEvent.setup();
		render(<Sidebar isAuthenticated={false} />);

		await user.tab();
		expect(screen.getByRole('link', { name: 'Rilog 메인으로 이동' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '피드' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('link', { name: '로그인' })).toHaveFocus();
	});
});
