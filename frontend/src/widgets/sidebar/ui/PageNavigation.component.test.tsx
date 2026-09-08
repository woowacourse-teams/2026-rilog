import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { renderWithQuery as render } from '@/test/render-with-query';

import PageNavigation from './PageNavigation';

const route = vi.hoisted(() => ({ pathname: '/feeds' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('next/link', () => ({
	default: ({
		onNavigate,
		prefetch: _prefetch,
		...props
	}: ComponentProps<'a'> & { onNavigate?: () => void; prefetch?: boolean }) => (
		<a
			{...props}
			onClick={(event) => {
				event.preventDefault();
				onNavigate?.();
			}}
		/>
	),
}));
vi.mock('@/shared/api/posts/queries/posts-count/use-query', () => ({
	usePostsCountQuery: () => ({ data: { data: { totalPostsCount: 123 } } }),
}));

describe('PageNavigation', () => {
	it('초기 Feed 활성과 전체 글 수, 세 메뉴의 피드 이동 경로를 제공한다', () => {
		route.pathname = '/feeds';
		render(<PageNavigation />);
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('aria-current', 'page');
		for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('href', '/feeds');
		expect(screen.getAllByRole('link')).toHaveLength(3);
	});

	it('선택한 메뉴만 활성화하고 전체 글 수 배지를 유지한다', async () => {
		route.pathname = '/feeds';
		const user = userEvent.setup();
		render(<PageNavigation />);
		for (const name of ['개인', 'Colog', '피드 글 123개']) {
			await user.click(screen.getByRole('link', { name }));
			expect(screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([
				screen.getByRole('link', { name }),
			]);
			expect(screen.getByText('123')).toBeInTheDocument();
		}
	});

	it('Tab과 Enter로 하위 메뉴를 선택한다', async () => {
		route.pathname = '/feeds';
		const user = userEvent.setup();
		render(<PageNavigation />);
		for (const name of ['피드 글 123개', '개인', 'Colog']) {
			await user.tab();
			expect(screen.getByRole('link', { name })).toHaveFocus();
			await user.keyboard('{Enter}');
			expect(screen.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
		}
	});

	it('다른 페이지에서 선택한 하위 메뉴를 피드에 도착하면 활성화한다', async () => {
		route.pathname = '/@rilog';
		const user = userEvent.setup();
		const { rerender } = render(<PageNavigation />);
		expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('aria-current'))).toBe(true);
		await user.click(screen.getByRole('link', { name: '개인' }));
		route.pathname = '/feeds';
		rerender(<PageNavigation />);
		expect(screen.getByRole('link', { name: '개인' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '피드 글 123개' })).not.toHaveAttribute('aria-current');
	});
});
