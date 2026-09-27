import { describe, expect, it } from 'vitest';

import { mapPostCommentAnchorsResponse } from './map-post-comment-anchors-response';

const comment = {
	commentAnchorId: 91,
	content: '댓글',
	author: {
		userId: 7,
		nickname: '작성자',
		slug: 'author',
		profileImageUrl: null,
		isPostAuthor: true,
		isBlogMember: false,
	},
	canEdit: false,
	canDelete: true,
	createdAt: '2026-09-27T07:47:07.958Z',
	updatedAt: '2026-09-27T07:47:07.959Z',
};

describe('mapPostCommentAnchorsResponse', () => {
	it('선택 id와 댓글 id를 구분하고 ORPHANED를 OUTDATED로 변환하며 순서, 범위 및 권한을 보존한다', () => {
		const group = {
			selectionId: 25,
			range: { startOffset: 1, endOffset: 5 },
			selectedText: '인용',
			state: 'ORPHANED' as const,
			anchorCount: 1,
			commentAnchors: [comment],
		};
		const result = mapPostCommentAnchorsResponse({
			status: 0,
			message: 'OK',
			data: {
				blocks: [
					{ blockId: 'second', anchorGroups: [group, { ...group, selectionId: 2, state: 'ACTIVE' }] },
					{ blockId: 'first', anchorGroups: [] },
				],
			},
		});
		expect(result.map((block) => block.blockId)).toEqual(['second', 'first']);
		expect(result[0].anchors.map((anchor) => anchor.anchorId)).toEqual([25, 2]);
		expect(result[0].anchors[1].state).toBe('ACTIVE');
		expect(result[0].anchors[0]).toEqual({
			anchorId: 25,
			commentCount: 1,
			range: group.range,
			selectedText: '인용',
			state: 'OUTDATED',
			comments: [
				{
					commentId: 91,
					content: '댓글',
					author: {
						userId: 7,
						nickname: '작성자',
						slug: 'author',
						profileImageUrl: null,
						isAuthor: true,
						isBlogMember: false,
					},
					canEdit: false,
					canDelete: true,
					createdAt: comment.createdAt,
					updatedAt: comment.updatedAt,
				},
			],
		});
	});
	it('빈 목록을 유지하고 데이터 누락을 빈 목록으로 숨기지 않는다', () => {
		expect(mapPostCommentAnchorsResponse({ status: 0, message: 'OK', data: { blocks: [] } })).toEqual([]);
		expect(() => mapPostCommentAnchorsResponse({ status: 0, message: 'OK' })).toThrow();
	});
});
