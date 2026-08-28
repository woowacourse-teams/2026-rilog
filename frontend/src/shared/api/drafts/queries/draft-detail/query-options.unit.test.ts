import { describe, expect, it, vi } from 'vitest';

import { readDraftDetail } from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

import { draftDetailQueryOptions } from './query-options';

vi.mock('@/shared/api/drafts/api', () => ({
	readDraftDetail: vi.fn(),
}));

describe('draftDetailQueryOptions', () => {
	it('draftId를 query key와 상세 조회 함수에 전달한다', async () => {
		vi.mocked(readDraftDetail).mockResolvedValue({
			status: 200,
			message: 'OK',
			data: {
				draftId: 42,
				title: '작성 중인 글',
				content: [],
				status: 'DRAFT',
				publishedAt: '2026-08-27T10:42:11.852Z',
			},
		});
		const options = draftDetailQueryOptions(42);

		expect(options.queryKey).toEqual(draftsQueryKeys.detail(42));
		await options.queryFn?.({} as never);
		expect(readDraftDetail).toHaveBeenCalledWith({ draftId: 42 });
	});
});
