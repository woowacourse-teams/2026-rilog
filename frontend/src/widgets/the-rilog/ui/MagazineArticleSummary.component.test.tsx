import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MagazineArticleSummary from './MagazineArticleSummary';

const SUMMARY = '화면 공간에 맞춰 읽을 수 있는 기사 설명입니다.';

function ArticleFixture({ fitToThumbnail = true }: { fitToThumbnail?: boolean }) {
	return (
		<article>
			<div data-thumbnail-ratio="16:10" />
			<div>
				<span>기업 프로필</span>
				<h3>기사 제목</h3>
				<MagazineArticleSummary text={SUMMARY} fitToThumbnail={fitToThumbnail} />
			</div>
		</article>
	);
}

describe('MagazineArticleSummary', () => {
	let thumbnailHeight: number;
	let notifyResize: () => void;
	let disconnect: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// jsdom이 제공하지 않는 실제 레이아웃 좌표와 계산 스타일만 보충한다.
		thumbnailHeight = 160;
		disconnect = vi.fn();
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					notifyResize = callback;
				}
				observe() {}
				disconnect = disconnect;
			},
		);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			if (this.hasAttribute('data-thumbnail-ratio')) {
				return new DOMRect(0, 0, 160, thumbnailHeight);
			}
			if (this.tagName === 'P') return new DOMRect(180, 80, 200, 40);
			return new DOMRect();
		});
		const getActualStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
			const style = getActualStyle(element, pseudoElement);
			return new Proxy(style, {
				get(target, property) {
					if (property === 'lineHeight' && element.tagName === 'P') return '20px';
					if (property === 'paddingBottom') return '0px';
					if (property === 'getPropertyValue') return target.getPropertyValue.bind(target);
					const value: unknown = Reflect.get(target, property);
					return value;
				},
			});
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('설명이 보이는 카드에서 공간이 줄었다가 회복되면 설명이 숨겨졌다가 다시 보인다', () => {
		render(<ArticleFixture />);
		const summary = screen.getByText(SUMMARY);
		expect(summary).toBeVisible();

		thumbnailHeight = 80;
		act(() => notifyResize());
		expect(summary).not.toBeVisible();

		thumbnailHeight = 160;
		act(() => notifyResize());
		expect(summary).toBeVisible();
	});

	it('공간 부족으로 숨겨진 설명에서 썸네일 높이 제한을 해제하면 설명이 다시 보인다', () => {
		thumbnailHeight = 80;
		const { rerender } = render(<ArticleFixture />);
		expect(screen.getByText(SUMMARY)).not.toBeVisible();

		rerender(<ArticleFixture fitToThumbnail={false} />);
		expect(screen.getByText(SUMMARY)).toBeVisible();
	});

	it('카드를 언마운트하면 브라우저의 크기 관찰을 해제한다', () => {
		const { unmount } = render(<ArticleFixture />);
		unmount();
		expect(disconnect).toHaveBeenCalled();
	});

	it('ResizeObserver가 없는 브라우저에서 창 크기가 바뀌면 설명을 복구하고 언마운트 시 이벤트를 해제한다', () => {
		vi.stubGlobal('ResizeObserver', undefined);
		thumbnailHeight = 80;
		const removeListener = vi.spyOn(window, 'removeEventListener');
		const { unmount } = render(<ArticleFixture />);
		expect(screen.getByText(SUMMARY)).not.toBeVisible();

		thumbnailHeight = 160;
		fireEvent(window, new Event('resize'));
		expect(screen.getByText(SUMMARY)).toBeVisible();

		unmount();
		expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
	});
});
