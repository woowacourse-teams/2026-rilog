import { describe, expect, it } from 'vitest';

import { isPostDetailQueryKey, isPreviousSessionPostDetailQueryKey, postsQueryKeys } from './keys';

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
		expect(postsQueryKeys.details()).toEqual(['authenticated', 'posts', 'detail']);
	});

	it('게시글 상세 응답을 postId별로 구분한다', () => {
		expect(postsQueryKeys.detail('rilog-team', 42, 3)).toEqual([
			'authenticated',
			'posts',
			'detail',
			'rilog-team',
			42,
			3,
		]);
		expect(postsQueryKeys.detail('rilog-team', 42, 3)).not.toEqual(postsQueryKeys.detail('rilog-team', 43, 3));
		expect(postsQueryKeys.detail('rilog-team', 42, 3)).not.toEqual(postsQueryKeys.detail('rilog-team', 42, 4));
		expect(postsQueryKeys.detail('@rilog-team', 42, 3)).toEqual(postsQueryKeys.detail('rilog-team', 42, 3));
	});

	it('상세 key를 다른 인증 캐시와 구분한다', () => {
		expect(isPostDetailQueryKey(postsQueryKeys.detail('rilog', 42, 0))).toBe(true);
		expect(isPostDetailQueryKey(postsQueryKeys.commentAnchors(42))).toBe(false);
		expect(isPostDetailQueryKey(['authenticated', 'users', 'me'])).toBe(false);
		expect(isPostDetailQueryKey(['posts', 'detail', 'rilog', 42, 0])).toBe(false);
	});

	it('현재 세대 상세와 다른 resource는 보존하고 이전 세대 상세만 정리한다', () => {
		expect(isPreviousSessionPostDetailQueryKey(postsQueryKeys.detail('rilog', 42, 0), 1)).toBe(true);
		expect(isPreviousSessionPostDetailQueryKey(postsQueryKeys.detail('rilog', 42, 1), 1)).toBe(false);
		expect(isPreviousSessionPostDetailQueryKey(postsQueryKeys.commentAnchors(42), 1)).toBe(false);
	});
});
