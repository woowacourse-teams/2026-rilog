import { describe, expect, it } from 'vitest';

import { buildPostDetailPath } from './build-post-detail-path';

describe('buildPostDetailPath', () => {
	it('게시글 ID를 URL segment로 인코딩한다', () => {
		expect(buildPostDetailPath('post/40')).toBe('/posts/post%2F40');
	});

	it('게시글 ID 앞뒤 공백을 제거한다', () => {
		expect(buildPostDetailPath('  post-40  ')).toBe('/posts/post-40');
	});

	it('빈 게시글 ID는 허용하지 않는다', () => {
		expect(() => buildPostDetailPath('   ')).toThrow('게시글 ID가 필요합니다.');
	});
});
