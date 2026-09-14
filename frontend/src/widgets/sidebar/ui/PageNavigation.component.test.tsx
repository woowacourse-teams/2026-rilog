import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { POST_FEED_SCROLL_TARGET_ID } from '@/features/post-feed/lib/navigate-feed-filter';
import { renderWithQuery as render } from '@/test/render-with-query';

import PageNavigation from './PageNavigation';

type MockNextLinkProps = ComponentProps<'a'> & {
	onNavigate?: (event: { preventDefault: () => void }) => void;
	prefetch?: boolean;
	scroll?: boolean;
};

const { postsCountQuery } = vi.hoisted(() => {
	const current: {
		data: { status: number; message: string; data: { totalPostsCount: number } } | undefined;
		isPending: boolean;
		isFetching: boolean;
	} = {
		data: { status: 200, message: 'OK', data: { totalPostsCount: 123 } },
		isPending: false,
		isFetching: false,
	};

	return { postsCountQuery: { current } };
});
const route = vi.hoisted(() => ({ pathname: '/feeds', searchParams: new URLSearchParams() }));
const analyticsMock = vi.hoisted(() => ({ sidebarFeedFilterClicked: vi.fn() }));
vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));
vi.mock('next/navigation', () => ({
	usePathname: () => route.pathname,
	useSearchParams: () => route.searchParams,
}));
vi.mock('next/link', () => ({
	default: ({ prefetch: _prefetch, scroll, onNavigate, ...props }: MockNextLinkProps) => {
		const handleClick: ComponentProps<'a'>['onClick'] = (event) => {
			props.onClick?.(event);
			if (!event.defaultPrevented) onNavigate?.({ preventDefault: () => event.preventDefault() });
		};

		return <a {...props} data-next-scroll={String(scroll)} onClick={handleClick} />;
	},
}));
vi.mock('@/shared/api/posts/queries/posts-count/use-query', () => ({
	usePostsCountQuery: ({
		select,
	}: {
		select?: (response: NonNullable<typeof postsCountQuery.current.data>) => unknown;
	}) => ({
		...postsCountQuery.current,
		data:
			postsCountQuery.current.data === undefined
				? undefined
				: (select?.(postsCountQuery.current.data) ?? postsCountQuery.current.data),
	}),
}));

describe('PageNavigation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		route.pathname = '/feeds';
		route.searchParams = new URLSearchParams();
		postsCountQuery.current = {
			data: { status: 200, message: 'OK', data: { totalPostsCount: 123 } },
			isPending: false,
			isFetching: false,
		};
	});

	it('현재 Feed를 제외한 Personal, Colog 클릭을 선택한 피드 범위와 함께 기록한다', () => {
		render(<PageNavigation />);

		fireEvent.click(screen.getByRole('link', { name: '피드 글 123개' }));
		fireEvent.click(screen.getByRole('link', { name: 'Personal' }));
		fireEvent.click(screen.getByRole('link', { name: 'Colog' }));

		expect(analyticsMock.sidebarFeedFilterClicked).toHaveBeenNthCalledWith(1, { feedScope: 'RILOG' });
		expect(analyticsMock.sidebarFeedFilterClicked).toHaveBeenNthCalledWith(2, { feedScope: 'COLOG' });
	});

	it.each([
		['', '피드 글 123개'],
		['blogType=personal', 'Personal'],
		['blogType=colog', 'Colog'],
	] as const)('URL %s에서 현재 활성 메뉴를 다시 클릭하면 기록하지 않는다', (searchParams, name) => {
		route.searchParams = new URLSearchParams(searchParams);
		render(<PageNavigation />);

		fireEvent.click(screen.getByRole('link', { name }));

		expect(analyticsMock.sidebarFeedFilterClicked).not.toHaveBeenCalled();
	});

	afterEach(() => {
		document.getElementById(POST_FEED_SCROLL_TARGET_ID)?.remove();
		vi.restoreAllMocks();
	});

	it('URL 필터가 없으면 Feed 활성과 전체 글 수, 세 메뉴의 필터 이동 경로를 제공한다', () => {
		render(<PageNavigation />);
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('href', '/feeds');
		expect(screen.getByRole('link', { name: 'Personal' })).toHaveAttribute('href', '/feeds?blogType=personal');
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute('href', '/feeds?blogType=colog');
		for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-next-scroll', 'false');
		expect(screen.getAllByRole('link')).toHaveLength(3);
	});

	it.each([
		[undefined, '피드 글 123개'],
		['personal', 'Personal'],
		['colog', 'Colog'],
	] as const)('URL blogType=%s에 해당하는 메뉴만 활성화하고 전체 글 수 배지를 유지한다', (blogType, name) => {
		route.searchParams = new URLSearchParams(blogType === undefined ? '' : `blogType=${blogType}`);
		render(<PageNavigation />);

		expect(screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toEqual([
			screen.getByRole('link', { name }),
		]);
		expect(screen.getByText('123')).toBeInTheDocument();
	});

	it('notice를 유지하고 Feed, 개인, Colog 이동 시 카테고리를 전체로 초기화한다', () => {
		route.searchParams = new URLSearchParams('category=daily&notice=auth-required');
		render(<PageNavigation />);

		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('href', '/feeds?notice=auth-required');
		expect(screen.getByRole('link', { name: 'Personal' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=personal',
		);
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=colog',
		);
	});

	it('다른 페이지에서는 현재 query를 피드 링크에 옮기거나 메뉴를 활성화하지 않는다', () => {
		route.pathname = '/@rilog';
		route.searchParams = new URLSearchParams('blogType=personal&category=tech');
		render(<PageNavigation />);

		expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('aria-current'))).toBe(true);
		expect(screen.getByRole('link', { name: '피드 글 123개' })).toHaveAttribute('href', '/feeds');
		expect(screen.getByRole('link', { name: 'Personal' })).toHaveAttribute('href', '/feeds?blogType=personal');
		expect(screen.getByRole('link', { name: 'Colog' })).toHaveAttribute('href', '/feeds?blogType=colog');
		for (const link of screen.getAllByRole('link')) expect(link).toHaveAttribute('data-next-scroll', 'true');
	});

	it('/feeds 깊은 스크롤의 일반 클릭은 category를 초기화하고 비-sticky 피드 시작점으로 이동한다', () => {
		route.searchParams = new URLSearchParams('blogType=personal&category=retrospect');
		const pushState = vi.spyOn(window.history, 'pushState');
		const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
		const animationFrames: FrameRequestCallback[] = [];
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			animationFrames.push(callback);
			return animationFrames.length;
		});
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1_200);
		const scrollTarget = document.createElement('div');
		scrollTarget.id = POST_FEED_SCROLL_TARGET_ID;
		document.body.append(scrollTarget);
		vi.spyOn(scrollTarget, 'getBoundingClientRect').mockReturnValue({ top: -800 } as DOMRect);
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(element) =>
				({
					scrollMarginTop: element === scrollTarget ? '32px' : '0px',
					getPropertyValue: () => '',
				}) as unknown as CSSStyleDeclaration,
		);
		render(<PageNavigation />);

		const isDefaultPrevented = fireEvent.click(screen.getByRole('link', { name: '피드 글 123개' }));

		expect(isDefaultPrevented).toBe(false);
		expect(pushState).toHaveBeenCalledWith(null, '', '/feeds');
		animationFrames.shift()?.(0);
		animationFrames.shift()?.(1_000);
		expect(scrollTo).toHaveBeenLastCalledWith({ top: 368, behavior: 'auto' });
	});

	it('피드 밖에서는 링크의 기본 navigation을 막지 않는다', () => {
		route.pathname = '/@rilog';
		const pushState = vi.spyOn(window.history, 'pushState');
		render(<PageNavigation />);

		const isDefaultPrevented = fireEvent.click(screen.getByRole('link', { name: 'Personal' }));

		expect(isDefaultPrevented).toBe(true);
		expect(pushState).not.toHaveBeenCalled();
	});

	it('실제 전체 글 수가 0일 때만 0개로 표시한다', () => {
		postsCountQuery.current.data = { status: 200, message: 'OK', data: { totalPostsCount: 0 } };

		render(<PageNavigation />);

		expect(screen.getByRole('link', { name: '피드 글 0개' })).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
	});

	it('전체 글 수를 불러오는 동안 0개로 표시하지 않는다', () => {
		postsCountQuery.current = { data: undefined, isPending: true, isFetching: true };

		render(<PageNavigation />);

		expect(screen.getByRole('link', { name: '피드 글 수 불러오는 중' })).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: '피드 글 수 불러오는 중' }).querySelector('.animate-pulse'),
		).toBeInTheDocument();
		expect(screen.queryByText('0')).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /0개/ })).not.toBeInTheDocument();
	});

	it('전체 글 수 조회가 실패하면 0개로 표시하지 않는다', () => {
		postsCountQuery.current = { data: undefined, isPending: false, isFetching: false };

		render(<PageNavigation />);

		expect(screen.getByRole('link', { name: '피드 글 수를 불러오지 못함' })).toBeInTheDocument();
		expect(screen.queryByText('0')).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /0개/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /다시 시도/ })).not.toBeInTheDocument();
	});
});
