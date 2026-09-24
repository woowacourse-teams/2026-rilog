import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AboutViewportReveal from './AboutViewportReveal';

afterEach(() => {
	document.querySelectorAll('[data-about-reveal]').forEach((element) => element.remove());
	vi.unstubAllGlobals();
});

describe('AboutViewportReveal', () => {
	it('모션 감소 환경에서는 대상 내용을 즉시 표시한다', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true })),
		);
		const section = document.createElement('section');
		section.dataset.aboutReveal = '';
		document.body.append(section);

		render(<AboutViewportReveal />);

		expect(section.dataset.aboutRevealVisible).toBe('true');
	});

	it('viewport에 진입한 대상만 표시하고 관찰을 중단한다', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: false })),
		);
		const section = document.createElement('section');
		section.dataset.aboutReveal = '';
		document.body.append(section);
		let callback: IntersectionObserverCallback = () => undefined;
		const observe = vi.fn();
		const unobserve = vi.fn();
		const disconnect = vi.fn();
		const observerForCallback: IntersectionObserver = {
			disconnect,
			observe,
			root: null,
			rootMargin: '',
			takeRecords: () => [],
			thresholds: [],
			unobserve,
		};
		class IntersectionObserverMock implements IntersectionObserver {
			root = null;
			rootMargin = '';
			thresholds = [];
			observe = observe;
			unobserve = unobserve;
			disconnect = disconnect;
			takeRecords = () => [];

			constructor(nextCallback: IntersectionObserverCallback) {
				callback = nextCallback;
			}
		}
		vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

		const { unmount } = render(<AboutViewportReveal />);
		expect(observe).toHaveBeenCalledWith(section);

		const sectionRect = section.getBoundingClientRect();
		act(() =>
			callback(
				[
					{
						boundingClientRect: sectionRect,
						intersectionRatio: 1,
						intersectionRect: sectionRect,
						isIntersecting: true,
						rootBounds: null,
						target: section,
						time: 0,
					},
				],
				observerForCallback,
			),
		);
		expect(section.dataset.aboutRevealVisible).toBe('true');
		expect(unobserve).toHaveBeenCalledWith(section);

		unmount();
		expect(disconnect).toHaveBeenCalledOnce();
	});
});
