import { describe, expect, it } from 'vitest';

import { postsQueryKeys } from './keys';

describe('postsQueryKeys', () => {
	it('모든 게시글 상세 쿼리를 무효화할 수 있는 상위 key를 제공한다', () => {
		expect(postsQueryKeys.details()).toEqual(['posts', 'detail']);
	});

	it('게시글 상세 응답을 postId별로 구분한다', () => {
		expect(postsQueryKeys.detail(42)).toEqual(['posts', 'detail', 42]);
		expect(postsQueryKeys.detail(42)).not.toEqual(postsQueryKeys.detail(43));
	});
});
