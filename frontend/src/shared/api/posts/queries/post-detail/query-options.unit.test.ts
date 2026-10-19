import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { postDetailQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('postDetailQueryOptions', () => {
	it('slug와 postId를 detail key와 API 요청에 전달한다', async () => {
		const readDetail = vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue({ status: 200, message: 'OK' });
		const options = postDetailQueryOptions('@rilog-team', 42, 3);

		expect(options.queryKey).toEqual(postsQueryKeys.detail('rilog-team', 42, 3));
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		const signal = new AbortController().signal;
		await options.queryFn({ client: new QueryClient(), queryKey: options.queryKey, signal, meta: undefined });
		expect(readDetail).toHaveBeenCalledWith({ slug: 'rilog-team', postId: 42 }, { cache: 'no-store', signal });
	});
});
