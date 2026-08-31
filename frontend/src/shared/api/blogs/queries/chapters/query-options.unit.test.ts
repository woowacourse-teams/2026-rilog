import { afterEach, describe, expect, it, vi } from 'vitest';

import * as blogsApi from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { blogChaptersQueryOptions } from './query-options';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('blogChaptersQueryOptions', () => {
	it('정규화한 같은 slug로 query key와 API 요청을 구성한다', async () => {
		const readBlogChapters = vi.spyOn(blogsApi, 'readBlogChapters').mockResolvedValue({
			status: 200,
			message: '챕터 목록을 조회했습니다.',
			data: [],
		});

		const options = blogChaptersQueryOptions('@rilog');

		expect(options.queryKey).toEqual(blogsQueryKeys.chapters('rilog'));
		if (typeof options.queryFn !== 'function') {
			throw new Error('queryFn이 설정되어야 합니다.');
		}
		await options.queryFn({} as never);
		expect(readBlogChapters).toHaveBeenCalledWith('rilog');
	});
});
