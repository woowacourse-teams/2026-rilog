import { afterEach, describe, expect, it, vi } from 'vitest';

import * as usersApi from '@/shared/api/users/api';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import { userBySlugQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('userBySlugQueryOptions', () => {
	it('slug를 공개 사용자 key와 API 요청에 전달한다', async () => {
		const readUser = vi.spyOn(usersApi, 'readUserBySlug').mockResolvedValue({ status: 200, message: 'OK' });
		const options = userBySlugQueryOptions('jetproc');

		expect(options.queryKey).toEqual(usersQueryKeys.userBySlug('jetproc'));
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readUser).toHaveBeenCalledWith({ slug: 'jetproc' });
	});
});
