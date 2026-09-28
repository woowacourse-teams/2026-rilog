import { afterEach, describe, expect, it, vi } from 'vitest';

import * as usersApi from '@/shared/api/users/api';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import { myCologsOverviewQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('myCologsOverviewQueryOptions', () => {
	it('내 코로그 overview key로 API를 호출한다', async () => {
		const readOverview = vi.spyOn(usersApi, 'readMyCologsOverview').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: [],
		});
		const options = myCologsOverviewQueryOptions();

		expect(options.queryKey).toEqual(usersQueryKeys.myCologsOverview());
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readOverview).toHaveBeenCalledOnce();
	});
});
