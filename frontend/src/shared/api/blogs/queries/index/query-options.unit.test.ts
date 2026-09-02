import { describe, expect, it } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { blogIndexQueryOptions } from './query-options';

describe('blogIndexQueryOptions', () => {
	it('정규화한 slug의 인덱스 key를 사용한다', () => {
		const options = blogIndexQueryOptions('@rilog');

		expect(options.queryKey).toEqual(blogsQueryKeys.index('rilog'));
		expect(options.retry).toBe(false);
	});
});
