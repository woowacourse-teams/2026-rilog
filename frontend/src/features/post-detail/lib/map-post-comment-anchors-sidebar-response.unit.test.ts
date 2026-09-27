import { describe, expect, it } from 'vitest';

import { mapPostCommentAnchorsSidebarResponse } from './map-post-comment-anchors-sidebar-response';

describe('mapPostCommentAnchorsSidebarResponse', () => {
	it('동일 블록의 인용이 떨어져 있어도 서버 순서를 유지한다', () => {
		const anchorGroups = ['a', 'b', 'a'].map((blockId, selectionId) => ({
			blockId,
			selectionId,
			range: { startOffset: 0, endOffset: 1 },
			selectedText: '인용',
			state: 'ACTIVE' as const,
			anchorCount: 0,
			commentAnchors: [],
		}));
		const threads = mapPostCommentAnchorsSidebarResponse({ status: 0, message: 'OK', data: { anchorGroups } });
		expect(threads.map(({ blockId, anchor }) => [blockId, anchor.anchorId])).toEqual([
			['a', 0],
			['b', 1],
			['a', 2],
		]);
	});
	it('빈 목록을 유지하고 data 누락은 오류로 처리한다', () => {
		expect(mapPostCommentAnchorsSidebarResponse({ status: 0, message: 'OK', data: { anchorGroups: [] } })).toEqual([]);
		expect(() => mapPostCommentAnchorsSidebarResponse({ status: 0, message: 'OK' })).toThrow();
	});
});
