import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';

import { getInlineCommentOffsetAtPoint } from '../lib/inline-comment-interaction';

import PostDetailContent from './PostDetailContent';

const HTML = `
	<div class="bn-block-outer" data-id="block-1">
		<div class="bn-block-content" data-content-type="paragraph">
			<div class="bn-inline-content" data-inline-comment-root data-inline-comment-block-id="block-1">댓글 하이라이트 본문</div>
		</div>
	</div>
`;

const BLOCKS: InlineCommentBlockModel[] = [
	{
		blockId: 'block-1',
		anchors: [
			{
				anchorId: 1,
				commentCount: 0,
				range: { startOffset: 0, endOffset: 2 },
				selectedText: '댓글',
				state: 'ACTIVE',
				comments: [],
			},
			{
				anchorId: 2,
				commentCount: 2,
				range: { startOffset: 3, endOffset: 8 },
				selectedText: '하이라이트',
				state: 'OUTDATED',
				comments: [],
			},
			{
				anchorId: 3,
				commentCount: 0,
				range: { startOffset: 1, endOffset: 8 },
				selectedText: '글 하이라이',
				state: 'ACTIVE',
				comments: [],
			},
			{
				anchorId: 4,
				commentCount: 0,
				range: { startOffset: 0, endOffset: 100 },
				selectedText: '잘못된 범위',
				state: 'ACTIVE',
				comments: [],
			},
		],
	},
];

const createRect = (left: number, top: number, width: number, height: number): DOMRect => ({
	left,
	top,
	right: left + width,
	bottom: top + height,
	width,
	height,
	x: left,
	y: top,
	toJSON: () => ({}),
});

describe('InlineCommentHighlights', () => {
	let originalFontsDescriptor: PropertyDescriptor | undefined;
	beforeEach(() => {
		originalFontsDescriptor = Object.getOwnPropertyDescriptor(document, 'fonts');
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: vi.fn(() => [createRect(20, 30, 80, 20), createRect(20, 50, 40, 20)] as unknown as DOMRectList),
		});
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => createRect(10, 10, 200, 100));
	});

	afterEach(() => {
		Reflect.deleteProperty(document, 'caretPositionFromPoint');
		if (originalFontsDescriptor) Object.defineProperty(document, 'fonts', originalFontsDescriptor);
		else Reflect.deleteProperty(document, 'fonts');
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('ACTIVE anchor만 선택 범위별 하이라이트를 만들고 중첩 순서를 유지한다', async () => {
		const { container } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);

		await waitFor(() => {
			expect(container.querySelectorAll('[data-inline-comment-highlight]')).toHaveLength(4);
		});

		const anchorOneLines = container.querySelectorAll('[data-inline-comment-anchor-id="1"]');
		const anchorThreeLines = container.querySelectorAll('[data-inline-comment-anchor-id="3"]');
		expect(anchorOneLines).toHaveLength(2);
		expect(anchorThreeLines).toHaveLength(2);
		expect(container.querySelector('[data-inline-comment-anchor-id="2"]')).toBeNull();
		expect(container.querySelector('[data-inline-comment-anchor-id="4"]')).toBeNull();
		expect(anchorOneLines[0]).toHaveAttribute('data-inline-comment-anchor-order', '0');
		expect(anchorThreeLines[0]).toHaveAttribute('data-inline-comment-anchor-order', '2');
		expect(anchorOneLines[0]).toHaveStyle({ top: '38px' });
		expect(anchorOneLines[1]).toHaveStyle({ top: '58px' });

		expect(document.head.querySelector('[data-inline-comment-highlight-style]')).toBeNull();
	});

	it('데이터가 제거되면 기존 overlay를 정리한다', async () => {
		const { container, rerender } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);
		await waitFor(() => {
			expect(container.querySelector('[data-inline-comment-highlight-layer]')).not.toBeNull();
		});

		rerender(<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={[]} />);

		await waitFor(() => {
			expect(container.querySelector('[data-inline-comment-highlight-layer]')).toBeNull();
		});
	});

	it('블록의 스크롤 위치가 바뀐 뒤 다시 그리면 밑줄 좌표를 갱신한다', async () => {
		const { container } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);
		const host = container.querySelector<HTMLElement>('.bn-block-outer');
		expect(host).not.toBeNull();
		if (host === null) return;

		host.scrollLeft = 12;
		host.scrollTop = 5;
		fireEvent.resize(window);

		await waitFor(() => {
			const lines = container.querySelectorAll('[data-inline-comment-anchor-id="1"]');
			expect(lines[0]).toHaveStyle({ left: '22px', top: '43px' });
			expect(lines[1]).toHaveStyle({ left: '22px', top: '63px' });
		});
	});

	it('폰트가 이미 준비된 상태라면 ready 완료 후에도 초점이 맞춰진 인용 버튼을 유지한다', async () => {
		let resolveReady: () => void = () => {};
		const ready = new Promise<void>((resolve) => {
			resolveReady = resolve;
		});
		Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded', ready } });
		const { findByRole } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);
		const button = await findByRole('button', { name: '인용 “댓글”의 댓글 0개 보기' });
		button.focus();

		await act(async () => {
			resolveReady();
			await ready;
		});

		expect(button).toHaveFocus();
	});

	it('폰트가 로딩 중이면 ready 완료 후 변경된 밑줄 위치를 반영한다', async () => {
		let resolveReady: () => void = () => {};
		let top = 30;
		const ready = new Promise<void>((resolve) => {
			resolveReady = resolve;
		});
		Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loading', ready } });
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: vi.fn(() => [createRect(20, top, 80, 20)] as unknown as DOMRectList),
		});
		const { container } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);
		await waitFor(() =>
			expect(container.querySelector('[data-inline-comment-anchor-id="1"]')).toHaveStyle({ top: '38px' }),
		);

		top = 50;
		await act(async () => {
			resolveReady();
			await ready;
		});

		expect(container.querySelector('[data-inline-comment-anchor-id="1"]')).toHaveStyle({ top: '58px' });
	});

	it('첫 ResizeObserver 알림에서 본문 크기가 같으면 초점을 유지하고 크기가 바뀌면 밑줄을 갱신한다', async () => {
		let articleWidth = 200;
		let top = 30;
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
			return createRect(10, 10, this.hasAttribute('data-post-detail-content') ? articleWidth : 200, 100);
		});
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: vi.fn(() => [createRect(20, top, 80, 20)] as unknown as DOMRectList),
		});
		let onResize: ResizeObserverCallback = () => {};
		class TestResizeObserver {
			constructor(callback: ResizeObserverCallback) {
				onResize = callback;
			}
			observe() {}
			disconnect() {}
		}
		vi.stubGlobal('ResizeObserver', TestResizeObserver);
		const { container, findByRole } = render(
			<PostDetailContent html={HTML} postId={1} ownerType="RILOG" category="TECH" inlineCommentBlocks={BLOCKS} />,
		);
		const button = await findByRole('button', { name: '인용 “댓글”의 댓글 0개 보기' });
		button.focus();

		act(() => onResize([], {} as ResizeObserver));

		expect(button).toHaveFocus();
		articleWidth = 220;
		top = 50;
		act(() => onResize([], {} as ResizeObserver));
		expect(container.querySelector('[data-inline-comment-anchor-id="1"]')).toHaveStyle({ top: '58px' });
	});

	it('중첩 위치에서는 마지막 ACTIVE anchor를 hover하고 클릭한다', async () => {
		const handleOpen = vi.fn();
		const { container } = render(
			<PostDetailContent
				html={HTML}
				postId={1}
				ownerType="RILOG"
				category="TECH"
				inlineCommentBlocks={BLOCKS}
				onInlineCommentOpen={handleOpen}
			/>,
		);
		const root = container.querySelector<HTMLElement>('[data-inline-comment-root]');
		expect(root?.firstChild).toBeInstanceOf(Text);
		const caretPositionFromPoint = vi.fn(() => ({ offsetNode: root?.firstChild, offset: 1 }));
		Object.defineProperty(document, 'caretPositionFromPoint', {
			configurable: true,
			value: caretPositionFromPoint,
		});
		await waitFor(() => {
			expect(container.querySelectorAll('[data-inline-comment-anchor-proxy]')).toHaveLength(2);
		});
		await act(() => Promise.resolve());
		expect(getInlineCommentOffsetAtPoint(root as HTMLElement, 20, 30)).toBe(1);

		fireEvent.pointerMove(root as HTMLElement, { clientX: 20, clientY: 30 });
		expect(caretPositionFromPoint).toHaveBeenCalledWith(20, 30);
		await waitFor(() => {
			expect(container.querySelector('[data-inline-comment-anchor-id="3"]')).toHaveAttribute(
				'data-inline-comment-active',
			);
		});
		expect(container.querySelector('[data-inline-comment-anchor-id="1"]')).not.toHaveAttribute(
			'data-inline-comment-active',
		);
		expect(root).toHaveAttribute('data-inline-comment-pointer');

		fireEvent.click(root as HTMLElement, { clientX: 20, clientY: 30 });
		expect(handleOpen).toHaveBeenCalledWith({ blockId: 'block-1', anchorIds: [3], source: 'highlight' });

		const selection = window.getSelection();
		const selectionRange = document.createRange();
		selectionRange.setStart(root?.firstChild as Text, 0);
		selectionRange.setEnd(root?.firstChild as Text, 2);
		selection?.removeAllRanges();
		selection?.addRange(selectionRange);
		fireEvent.click(root as HTMLElement, { clientX: 20, clientY: 30 });
		expect(handleOpen).toHaveBeenCalledTimes(1);
		selection?.removeAllRanges();
	});

	it('anchor별 focus proxy와 블록 댓글 버튼으로 댓글 열기 요청을 전달한다', async () => {
		const handleOpen = vi.fn();
		const { container, getByRole } = render(
			<PostDetailContent
				html={HTML}
				postId={1}
				ownerType="RILOG"
				category="TECH"
				inlineCommentBlocks={BLOCKS}
				onInlineCommentOpen={handleOpen}
			/>,
		);

		await waitFor(() => {
			expect(container.querySelectorAll('[data-inline-comment-anchor-proxy]')).toHaveLength(2);
		});

		const anchorProxy = getByRole('button', { name: '인용 “댓글”의 댓글 0개 보기' });
		fireEvent.focus(anchorProxy);
		expect(container.querySelector('[data-inline-comment-anchor-id="1"]')).toHaveAttribute(
			'data-inline-comment-active',
		);
		fireEvent.click(anchorProxy);
		expect(handleOpen).toHaveBeenLastCalledWith({ blockId: 'block-1', anchorIds: [1], source: 'highlight' });

		fireEvent.click(getByRole('button', { name: '이 블록의 댓글 0개 보기' }));
		expect(handleOpen).toHaveBeenLastCalledWith({ blockId: 'block-1', anchorIds: [1, 3, 4], source: 'block' });
	});
});
