import { afterEach, describe, expect, it, vi } from 'vitest';

import * as cologsApi from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';

import { cologMembersQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('cologMembersQueryOptions', () => {
	it('@ 접두사를 제거한 slug로 key와 API 요청을 구성한다', async () => {
		const readMembers = vi.spyOn(cologsApi, 'readCologMembers').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: [],
		});
		const options = cologMembersQueryOptions('@rilog');

		expect(options.queryKey).toEqual(cologsQueryKeys.members('rilog'));
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');
		await options.queryFn({} as never);
		expect(readMembers).toHaveBeenCalledWith('rilog');
	});
});
