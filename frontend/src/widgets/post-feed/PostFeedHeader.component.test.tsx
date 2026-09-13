import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { POST_FEED_SCROLL_TARGET_ID } from '@/features/post-feed/lib/navigate-feed-filter';

import PostFeedHeader from './PostFeedHeader';

type MockNextLinkProps = ComponentProps<'a'> & {
	onNavigate?: (event: { preventDefault: () => void }) => void;
	scroll?: boolean;
};

const route = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));

vi.mock('next/navigation', () => ({
	useSearchParams: () => route.searchParams,
}));

vi.mock('next/link', () => ({
	default: ({ onNavigate, scroll: _scroll, ...props }: MockNextLinkProps) => (
		<a
			{...props}
			onClick={(event) => {
				props.onClick?.(event);
				if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && event.button === 0) {
					onNavigate?.({ preventDefault: () => event.preventDefault() });
				}
			}}
		/>
	),
}));

describe('PostFeedHeader', () => {
	beforeEach(() => {
		route.searchParams = new URLSearchParams();
	});

	afterEach(() => {
		document.getElementById(POST_FEED_SCROLL_TARGET_ID)?.remove();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it.each([
		['', 'All.'],
		['blogType=personal', 'Personal.'],
		['blogType=colog', 'Colog.'],
	] as const)('URL %s에 맞는 피드 범위 제목을 표시한다', (searchParams, title) => {
		route.searchParams = new URLSearchParams(searchParams);
		render(<PostFeedHeader id="post-feed-categories" />);

		expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: title }).children).toHaveLength(2);
	});

	it('URL에서 blogType이 제거되면 All 제목으로 갱신한다', () => {
		route.searchParams = new URLSearchParams('blogType=personal');
		const { rerender } = render(<PostFeedHeader id="post-feed-categories" />);
		expect(screen.getByRole('heading', { level: 2, name: 'Personal.' })).toBeInTheDocument();

		route.searchParams = new URLSearchParams();
		rerender(<PostFeedHeader id="post-feed-categories" />);

		expect(screen.getByRole('heading', { level: 2, name: 'All.' })).toBeInTheDocument();
	});

	it('피드 범위 제목은 비상호작용 h2로 렌더링한다', () => {
		render(<PostFeedHeader id="post-feed-categories" />);

		const title = screen.getByRole('heading', { level: 2, name: 'All.' });
		expect(title.tagName).toBe('H2');
		expect(title.closest('a')).toBeNull();
		expect(title).not.toHaveAttribute('tabindex');
	});

	it('카테고리 href와 현재 상태를 유지한다', () => {
		route.searchParams = new URLSearchParams('blogType=colog&category=daily&notice=auth-required');
		render(<PostFeedHeader id="post-feed-categories" />);

		expect(screen.getByRole('link', { name: '일상' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=colog&category=daily',
		);
		expect(screen.getByRole('link', { name: '일상' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '전체' })).toHaveAttribute(
			'href',
			'/feeds?notice=auth-required&blogType=colog',
		);
	});

	it('카테고리 링크는 키보드로 포커스할 수 있고 focus-visible outline 계약을 제공한다', () => {
		render(<PostFeedHeader id="post-feed-categories" />);

		const categoryLinks = screen.getAllByRole('link');

		categoryLinks.forEach((link) => {
			expect(link).not.toHaveAttribute('tabindex', '-1');
			expect(link).toHaveClass(
				'focus-visible:outline-2',
				'focus-visible:outline-offset-2',
				'focus-visible:outline-focus-ring',
			);
		});

		categoryLinks[0]?.focus();
		expect(categoryLinks[0]).toHaveFocus();
	});

	it('아래로 스크롤하면 숨고 위로 24px 이상 스크롤하면 다시 표시한다', () => {
		let scrollY = 0;
		vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
		render(<PostFeedHeader id="post-feed-categories" />);
		const header = screen.getByRole('banner', { name: 'All.' });
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);

		fireEvent.wheel(window);
		scrollY = 100;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');

		scrollY = 90;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');

		scrollY = 75;
		fireEvent.scroll(window);
		expect(header).toHaveClass('translate-y-0');

		scrollY = 76;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');
	});

	it('피드 시작점에 도착하면 표시하고 그 아래로 내리면 숨긴다', () => {
		let scrollY = 0;
		vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
		const scrollTarget = document.createElement('div');
		scrollTarget.id = POST_FEED_SCROLL_TARGET_ID;
		document.body.append(scrollTarget);
		vi.spyOn(scrollTarget, 'getBoundingClientRect').mockImplementation(() => ({ top: 363 - scrollY }) as DOMRect);
		render(<PostFeedHeader id="post-feed-categories" />);
		const header = screen.getByRole('banner', { name: 'All.' });
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);

		fireEvent.wheel(window);
		scrollY = 363;
		fireEvent.scroll(window);
		expect(header).toHaveClass('translate-y-0');

		scrollY = 365;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');

		scrollY = 340;
		fireEvent.scroll(window);
		expect(header).toHaveClass('translate-y-0');
	});

	it('필터 이동 중에는 숨겨진 헤더를 고정해 두고 완료 후 일반 스크롤 동작으로 돌아간다', () => {
		let scrollY = 0;
		vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => scrollY);
		const scrollTarget = document.createElement('div');
		scrollTarget.id = POST_FEED_SCROLL_TARGET_ID;
		document.body.append(scrollTarget);
		vi.spyOn(scrollTarget, 'getBoundingClientRect').mockImplementation(() => ({ top: 400 - scrollY }) as DOMRect);
		const animationFrames: FrameRequestCallback[] = [];
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			animationFrames.push(callback);
			return animationFrames.length;
		});
		vi.spyOn(window, 'scrollTo').mockImplementation((options) => {
			scrollY = Number((options as ScrollToOptions).top);
			fireEvent.scroll(window);
		});
		render(<PostFeedHeader id="post-feed-categories" />);
		const header = screen.getByRole('banner', { name: 'All.' });
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);

		fireEvent.wheel(window);
		scrollY = 1000;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');

		fireEvent.click(screen.getByRole('link', { name: '일상' }));
		expect(header).toHaveClass('translate-y-0', 'transition-none');
		act(() => animationFrames.shift()?.(0));
		act(() => animationFrames.shift()?.(250));
		expect(header).toHaveClass('translate-y-0', 'transition-none');
		act(() => animationFrames.shift()?.(500));
		expect(header).toHaveClass('translate-y-0', 'transition-transform');

		scrollY = 402;
		fireEvent.scroll(window);
		expect(header).toHaveClass('-translate-y-full');
	});

	it('깊은 스크롤의 일반 클릭은 비-sticky 피드 시작점으로 이동하며 modifier 클릭은 보존한다', () => {
		route.searchParams = new URLSearchParams('category=tech');
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
		render(<PostFeedHeader id="post-feed-categories" />);
		const header = screen.getByRole('banner', { name: 'All.' });
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(element) =>
				({
					scrollMarginTop: element === scrollTarget ? '32px' : '0px',
					getPropertyValue: () => '',
				}) as unknown as CSSStyleDeclaration,
		);

		fireEvent.click(screen.getByRole('link', { name: '일상' }));
		expect(pushState).toHaveBeenCalledWith(null, '', '/feeds?category=daily');
		animationFrames.shift()?.(0);
		animationFrames.shift()?.(1_000);
		expect(scrollTo).toHaveBeenLastCalledWith({ top: 368, behavior: 'auto' });

		pushState.mockClear();
		scrollTo.mockClear();
		fireEvent.click(screen.getByRole('link', { name: '회고' }), { ctrlKey: true, button: 0 });
		expect(pushState).not.toHaveBeenCalled();
		expect(scrollTo).not.toHaveBeenCalled();
	});

	it('모션 감소 설정에서는 깊은 스크롤에서도 같은 피드 시작점으로 즉시 이동한다', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1_200);
		const scrollTarget = document.createElement('div');
		scrollTarget.id = POST_FEED_SCROLL_TARGET_ID;
		document.body.append(scrollTarget);
		vi.spyOn(scrollTarget, 'getBoundingClientRect').mockReturnValue({ top: -800 } as DOMRect);
		render(<PostFeedHeader id="post-feed-categories" />);
		const header = screen.getByRole('banner', { name: 'All.' });
		vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(element) =>
				({
					scrollMarginTop: element === scrollTarget ? '32px' : '0px',
					getPropertyValue: () => '',
				}) as unknown as CSSStyleDeclaration,
		);

		fireEvent.click(screen.getByRole('link', { name: '일상' }));

		expect(scrollTo).toHaveBeenCalledWith({ top: 368, behavior: 'auto' });
	});

	it('필터 이동 중 사용자 입력이나 헤더 unmount가 발생하면 예약된 스크롤을 취소한다', () => {
		vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
		const animationFrames: FrameRequestCallback[] = [];
		let nextFrameId = 0;
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			animationFrames.push(callback);
			nextFrameId += 1;
			return nextFrameId;
		});
		const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
		vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1_200);
		const scrollTarget = document.createElement('div');
		scrollTarget.id = POST_FEED_SCROLL_TARGET_ID;
		document.body.append(scrollTarget);
		vi.spyOn(scrollTarget, 'getBoundingClientRect').mockReturnValue({ top: -800 } as DOMRect);
		vi.spyOn(window, 'getComputedStyle').mockReturnValue({
			scrollMarginTop: '32px',
			getPropertyValue: () => '',
		} as unknown as CSSStyleDeclaration);
		const { unmount } = render(<PostFeedHeader id="post-feed-categories" />);

		fireEvent.click(screen.getByRole('link', { name: '일상' }));
		animationFrames.shift()?.(0);
		fireEvent.wheel(window);
		expect(cancelAnimationFrame).toHaveBeenLastCalledWith(2);

		animationFrames.length = 0;
		fireEvent.click(screen.getByRole('link', { name: '기술' }));
		animationFrames.shift()?.(0);
		unmount();
		expect(cancelAnimationFrame).toHaveBeenLastCalledWith(4);
	});
});
