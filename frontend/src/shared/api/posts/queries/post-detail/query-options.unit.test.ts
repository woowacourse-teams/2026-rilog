import { afterEach, describe, expect, it, vi } from 'vitest';

import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { postDetailQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('postDetailQueryOptions', () => {
	it('postId를 detail key와 API 요청에 전달한다', async () => {
		const readDetail = vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue({ status: 200, message: 'OK' });
		const options = postDetailQueryOptions(42);

		expect(options.queryKey).toEqual(postsQueryKeys.detail(42));
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readDetail).toHaveBeenCalledWith({ postId: 42 });
	});
});
