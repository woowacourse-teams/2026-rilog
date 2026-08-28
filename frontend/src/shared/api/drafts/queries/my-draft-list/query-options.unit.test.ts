import { describe, expect, it, vi } from 'vitest';

import { readMyDraftList } from '../../api';
import { draftsQueryKeys } from '../keys';

import { myDraftListQueryOptions } from './query-options';

vi.mock('../../api', () => ({
	readMyDraftList: vi.fn(),
}));

describe('myDraftListQueryOptions', () => {
	it('0부터 조회하고 응답의 page와 hasNext로 다음 page를 계산한다', async () => {
		vi.mocked(readMyDraftList).mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { drafts: [], page: 0, size: 10, numberOfElements: 0, hasNext: false },
		});
		const options = myDraftListQueryOptions();

		expect(options.queryKey).toEqual(draftsQueryKeys.myList(10));
		expect(options.initialPageParam).toBe(0);

		await options.queryFn?.({ pageParam: 0 } as never);
		expect(readMyDraftList).toHaveBeenCalledWith({ page: 0, size: 10 });
		expect(
			options.getNextPageParam?.(
				{
					status: 200,
					message: 'OK',
					data: { drafts: [], page: 2, size: 10, numberOfElements: 0, hasNext: true },
				},
				[],
				2,
				[],
			),
		).toBe(3);
	});
});
