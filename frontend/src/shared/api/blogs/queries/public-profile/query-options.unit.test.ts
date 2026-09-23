import { afterEach, describe, expect, it, vi } from 'vitest';

import * as blogsApi from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { blogPublicProfileQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('blogPublicProfileQueryOptions', () => {
	it('slug를 profile key와 API 요청에 전달한다', async () => {
		const readProfile = vi.spyOn(blogsApi, 'readBlogPublicProfile').mockResolvedValue({
			status: 200,
			message: 'OK',
		});
		const options = blogPublicProfileQueryOptions('rilog');

		expect(options.queryKey).toEqual(blogsQueryKeys.publicProfile('rilog'));
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readProfile).toHaveBeenCalledWith({ slug: 'rilog' });
	});
});
