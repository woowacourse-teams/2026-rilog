import { describe, expect, it } from 'vitest';

import { appendSearchParams } from './append-search-params';

describe('appendSearchParams', () => {
	it('경로에 반복 파라미터와 빈 값을 전달하면 값이 있는 파라미터만 URL에 추가한다', () => {
		expect(appendSearchParams('/posts', { tag: ['a', 'b'], page: undefined })).toBe('/posts?tag=a&tag=b');
	});

	it('기존 쿼리가 있는 경로에 새 파라미터를 추가하면 기존 쿼리를 유지한다', () => {
		expect(appendSearchParams('/settings?tab=members', { invite: 'true' })).toBe('/settings?tab=members&invite=true');
	});

	it('기존 파라미터를 다시 전달하면 값을 교체하고 해시는 마지막에 유지한다', () => {
		expect(appendSearchParams('/posts?tag=old#comments', { tag: ['a', 'b'] })).toBe('/posts?tag=a&tag=b#comments');
	});
});
