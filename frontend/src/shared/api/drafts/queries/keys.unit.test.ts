import { describe, expect, it } from 'vitest';

import { draftsQueryKeys } from './keys';

describe('draftsQueryKeys', () => {
	it('응답에 영향을 주는 page size를 내 임시저장 목록 query key에 포함한다', () => {
		expect(draftsQueryKeys.myList(10)).toEqual(['drafts', 'me', { size: 10 }]);
		expect(draftsQueryKeys.myList(20)).not.toEqual(draftsQueryKeys.myList(10));
	});
});
