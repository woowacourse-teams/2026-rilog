import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { renderWithQuery as render } from '@/test/render-with-query';

import PageNavigation from './PageNavigation';

const route = vi.hoisted(() => ({ pathname: '/feeds', searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
	usePathname: () => route.pathname,
	useSearchParams: () => route.searchParams,
}));
vi.mock('next/link', () => ({
	default: ({
		prefetch: _prefetch,
		scroll,
		...props
	}: ComponentProps<'a'> & { prefetch?: boolean; scroll?: boolean }) => (
		<a {...props} data-next-scroll={String(scroll)} />
	),
}));
vi.mock('@/shared/api/posts/queries/posts-count/use-query', () => ({
	usePostsCountQuery: () => ({ data: { data: { totalPostsCount: 123 } } }),
}));

describe('PageNavigation', () => {
	it('URL 필터가 없으면 Feed 활성과 전체 글 수, 세 메뉴의 필터 이동 경로를 제공한다', () => {
		route.pathname = '/feeds';
		route.searchParams = new URLSearchParams();
		render(<PageNavigation />);
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('href', '/feeds');
		expect(screen.getByRole('link', { name: '개인' })).toHaveAttribute('href', '/feeds?blogType=rilog');
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute('href', '/feeds?blogType=colog');
		for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-next-scroll', 'false');
		expect(screen.getAllByRole('link')).toHaveLength(3);
	});

	it.each([
		[undefined, '피드 글 123개'],
		['rilog', '개인'],
		['colog', 'Colog'],
	] as const)('URL blogType=%s에 해당하는 메뉴만 활성화하고 전체 글 수 배지를 유지한다', (blogType, name) => {
		route.pathname = '/feeds';
		route.searchParams = new URLSearchParams(blogType === undefined ? '' : `blogType=${blogType}`);
		render(<PageNavigation />);

		expect(screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([
			screen.getByRole('link', { name }),
		]);
		expect(screen.getByText('123')).toBeInTheDocument();
	});

	it('카테고리와 notice를 세 피드 유형 링크에서 유지한다', () => {
		route.pathname = '/feeds';
		route.searchParams = new URLSearchParams('category=daily&notice=auth-required');
		render(<PageNavigation />);

		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&category=daily',
		);
		expect(screen.getByRole('link', { name: '개인' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=rilog&category=daily',
		);
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=colog&category=daily',
		);
	});

	it('다른 페이지에서는 현재 query를 피드 링크에 옮기거나 메뉴를 활성화하지 않는다', () => {
		route.pathname = '/@rilog';
		route.searchParams = new URLSearchParams('blogType=rilog&category=tech');
		render(<PageNavigation />);

		expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('aria-current'))).toBe(true);
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('href', '/feeds');
		expect(screen.getByRole('link', { name: '개인' })).toHaveAttribute('href', '/feeds?blogType=rilog');
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute('href', '/feeds?blogType=colog');
		for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-next-scroll', 'true');
	});
});
