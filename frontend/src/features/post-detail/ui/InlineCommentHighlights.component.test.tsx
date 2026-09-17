import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

import PostDetailContent from './PostDetailContent';

const HTML = `
	<div class="bn-block-outer" data-id="block-1">
		<div class="bn-block-content" data-content-type="paragraph">
			<div class="bn-inline-content" data-inline-comment-root data-inline-comment-block-id="block-1">댓글 하이라이트 본문</div>
		</div>
	</div>
`;

const BLOCKS: InlineCommentBlockResponse[] = [
	{
		blockId: 'block-1',
		anchors: [
			{
				anchorId: 1,
				range: { startOffset: 0, endOffset: 2 },
				selectedText: '댓글',
				state: 'ACTIVE',
				comments: [],
			},
			{
				anchorId: 2,
				range: { startOffset: 3, endOffset: 8 },
				selectedText: '하이라이트',
				state: 'OUTDATED',
				comments: [],
			},
			{
				anchorId: 3,
				range: { startOffset: 1, endOffset: 8 },
				selectedText: '글 하이라이',
				state: 'ACTIVE',
				comments: [],
			},
			{
				anchorId: 4,
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
	beforeEach(() => {
		Object.defineProperty(Range.prototype, 'getClientRects', {
			configurable: true,
			value: vi.fn(() => [createRect(20, 30, 80, 20), createRect(20, 50, 40, 20)] as unknown as DOMRectList),
		});
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => createRect(10, 10, 200, 100));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('ACTIVE anchor만 rect별 4px line을 만들고 원래 배열 index를 순서로 유지한다', async () => {
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
		expect(anchorOneLines[0]).toHaveStyle({ left: '10px', top: '20px', width: '80px' });
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
});
