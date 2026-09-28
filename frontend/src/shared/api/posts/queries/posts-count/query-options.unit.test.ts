import { afterEach, describe, expect, it, vi } from 'vitest';

import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { postsCountQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('postsCountQueryOptions', () => {
	it('게시글 수 key로 count API를 호출한다', async () => {
		const readCount = vi.spyOn(postsApi, 'readPostsCount').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { totalPostsCount: 0 },
		});
		const options = postsCountQueryOptions();

		expect(options.queryKey).toEqual(postsQueryKeys.count());
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readCount).toHaveBeenCalledOnce();
	});
});
