import { describe, expect, it } from 'vitest';

import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

import { getAllInlineCommentThreads, getInlineCommentThreadsByRequest } from './get-inline-comment-threads';

const BLOCKS: InlineCommentBlockResponse[] = [
	{
		blockId: 'block-1',
		anchors: [
			{ anchorId: 1, range: { startOffset: 0, endOffset: 1 }, selectedText: '첫 번째', state: 'ACTIVE', comments: [] },
			{
				anchorId: 2,
				range: { startOffset: 2, endOffset: 3 },
				selectedText: '두 번째',
				state: 'OUTDATED',
				comments: [],
			},
		],
	},
	{
		blockId: 'block-2',
		anchors: [
			{ anchorId: 3, range: { startOffset: 0, endOffset: 1 }, selectedText: '세 번째', state: 'ACTIVE', comments: [] },
		],
	},
];

describe('getInlineCommentThreads', () => {
	it('하이라이트 요청에 포함된 앵커만 반환한다', () => {
		expect(
			getInlineCommentThreadsByRequest(BLOCKS, { blockId: 'block-1', anchorIds: [1], source: 'highlight' }).map(
				(thread) => thread.anchor.anchorId,
			),
		).toEqual([1]);
	});

	it('블록 요청에서 OUTDATED 앵커를 제외하고 ACTIVE 앵커만 반환한다', () => {
		expect(
			getInlineCommentThreadsByRequest(BLOCKS, { blockId: 'block-1', anchorIds: [1, 2], source: 'block' }).map(
				(thread) => thread.anchor.anchorId,
			),
		).toEqual([1]);
	});

	it('OUTDATED 앵커만 포함된 블록 요청은 빈 목록을 반환한다', () => {
		expect(getInlineCommentThreadsByRequest(BLOCKS, { blockId: 'block-1', anchorIds: [2], source: 'block' })).toEqual(
			[],
		);
	});

	it('전체 댓글 요청은 모든 블록의 앵커를 순서대로 반환한다', () => {
		expect(getAllInlineCommentThreads(BLOCKS).map((thread) => thread.anchor.anchorId)).toEqual([1, 2, 3]);
	});
});
