import { describe, expect, it } from 'vitest';

import { cologsQueryKeys } from './keys';

describe('cologsQueryKeys', () => {
	it('팀 slug별 멤버 cache를 분리한다', () => {
		expect(cologsQueryKeys.members('rilog')).toEqual(['cologs', 'rilog', 'members']);
		expect(cologsQueryKeys.members('rilog')).not.toEqual(cologsQueryKeys.members('another'));
	});
});
