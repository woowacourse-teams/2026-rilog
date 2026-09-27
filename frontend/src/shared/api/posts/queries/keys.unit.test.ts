import { describe, expect, it } from 'vitest';

import { postsQueryKeys } from './keys';

describe('postsQueryKeys', () => {
	it('인라인 댓글을 게시글과 로그인 여부로 구분하고 인증 캐시 정리에 포함한다', () => {
		expect(postsQueryKeys.commentAnchorLists(81)).toEqual(['authenticated', 'posts', 'comment-anchors', 81]);
		expect(postsQueryKeys.commentAnchors(81)).toEqual(['authenticated', 'posts', 'comment-anchors', 81, false]);
		expect(postsQueryKeys.commentAnchors(81)).not.toEqual(postsQueryKeys.commentAnchors(82));
		expect(postsQueryKeys.commentAnchors(81, false)).not.toEqual(postsQueryKeys.commentAnchors(81, true));
	});

	it('사이드바 캐시는 본문과 분리하고 게시글 댓글 무효화 범위에 포함한다', () => {
		expect(postsQueryKeys.commentAnchorsSidebar(81)).toEqual([
			...postsQueryKeys.commentAnchorLists(81),
			'sidebar',
			false,
		]);
		expect(postsQueryKeys.commentAnchorsSidebar(81)).not.toEqual(postsQueryKeys.commentAnchors(81));
		expect(postsQueryKeys.commentAnchorsSidebar(81)).not.toEqual(postsQueryKeys.commentAnchorsSidebar(82));
		expect(postsQueryKeys.commentAnchorsSidebar(81, true)).not.toEqual(postsQueryKeys.commentAnchorsSidebar(81, false));
	});

	it('모든 게시글 상세 쿼리를 무효화할 수 있는 상위 key를 제공한다', () => {
		expect(postsQueryKeys.details()).toEqual(['posts', 'detail']);
	});

	it('게시글 상세 응답을 postId별로 구분한다', () => {
		expect(postsQueryKeys.detail('rilog-team', 42)).toEqual(['posts', 'detail', 'rilog-team', 42]);
		expect(postsQueryKeys.detail('rilog-team', 42)).not.toEqual(postsQueryKeys.detail('rilog-team', 43));
	});
});
