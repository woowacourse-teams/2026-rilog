import { afterEach, describe, expect, it, vi } from 'vitest';

import * as usersApi from '@/shared/api/users/api';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import { myInfoQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('myInfoQueryOptions', () => {
	it('내 정보 key와 요청 취소 signal을 API에 전달한다', async () => {
		const readMyInfo = vi.spyOn(usersApi, 'readMyInfo').mockResolvedValue({ status: 200, message: 'OK' });
		const signal = new AbortController().signal;
		const options = myInfoQueryOptions();

		expect(options.queryKey).toEqual(usersQueryKeys.myInfo());
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({ signal } as never);
		expect(readMyInfo).toHaveBeenCalledWith(signal);
	});
});
