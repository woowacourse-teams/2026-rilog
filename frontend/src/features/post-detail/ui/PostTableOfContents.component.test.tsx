import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostTableOfContentsItem } from '@/features/post-detail/lib/extract-post-table-of-contents';

import PostTableOfContents from './PostTableOfContents';

const ITEMS: PostTableOfContentsItem[] = [
	{ id: '문제-상황', text: '문제 상황', level: 2 },
	{ id: '해결-방법', text: '해결 방법', level: 3 },
];
const HISTORY_STATE = { route: 'post-detail' };

describe('PostTableOfContents', () => {
	let observerCallback: IntersectionObserverCallback;
	let observedHeadings: Element[];

	beforeEach(() => {
		observedHeadings = [];

		class IntersectionObserverMock {
			root = null;
			rootMargin = '';
			thresholds = [];
			disconnect = vi.fn();
			unobserve = vi.fn();
			takeRecords = () => [];

			constructor(callback: IntersectionObserverCallback) {
				observerCallback = callback;
			}

			observe = (target: Element) => {
				observedHeadings.push(target);
			};
		}

		vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: false }) as MediaQueryList),
		);
		window.history.replaceState(HISTORY_STATE, '', '/blogs/rilog/posts/1?from=feed');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('본문 스크롤에 따라 현재 헤딩을 표시한다', () => {
		render(
			<>
				<h2 id="문제-상황">문제 상황</h2>
				<h3 id="해결-방법">해결 방법</h3>
				<PostTableOfContents items={ITEMS} />
			</>,
		);

		expect(observedHeadings).toEqual([document.getElementById('문제-상황'), document.getElementById('해결-방법')]);

		act(() => {
			observerCallback(
				[
					{
						isIntersecting: true,
						target: document.getElementById('해결-방법'),
						boundingClientRect: { top: 100 },
					} as unknown as IntersectionObserverEntry,
				],
				{} as IntersectionObserver,
			);
		});

		expect(screen.getByRole('link', { name: '해결 방법' })).toHaveAttribute('aria-current', 'location');
	});

	it('목차 클릭 시 history를 추가하지 않고 기존 state를 보존한 채 헤딩으로 이동한다', async () => {
		const user = userEvent.setup();
		const historyLength = window.history.length;
		render(
			<>
				<h2 id="문제-상황">문제 상황</h2>
				<PostTableOfContents items={[ITEMS[0]]} />
			</>,
		);
		const heading = screen.getByRole('heading', { name: '문제 상황' });
		const scrollIntoView = vi.fn();
		heading.scrollIntoView = scrollIntoView;

		await user.click(screen.getByRole('link', { name: '문제 상황' }));

		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
		expect(window.location.pathname).toBe('/blogs/rilog/posts/1');
		expect(window.location.search).toBe('?from=feed');
		expect(decodeURIComponent(window.location.hash.slice(1))).toBe('문제-상황');
		expect(window.history.length).toBe(historyLength);
		expect(window.history.state).toEqual(HISTORY_STATE);
	});

	it('대상 헤딩을 찾지 못해도 기본 hash navigation을 실행하지 않는다', async () => {
		const user = userEvent.setup();
		render(<PostTableOfContents items={[ITEMS[0]]} />);

		await user.click(screen.getByRole('link', { name: '문제 상황' }));

		expect(window.location.hash).toBe('');
	});
});
