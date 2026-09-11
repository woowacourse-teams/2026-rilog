import { describe, expect, it } from 'vitest';

import { willExceedCologMemberLimit } from './colog-member-limit';

describe('willExceedCologMemberLimit', () => {
	it('현재 멤버와 초대 후보가 합해 20명이면 제한을 초과하지 않는다', () => {
		expect(willExceedCologMemberLimit(18, 2)).toBe(false);
	});

	it('오너와 어드민을 포함한 현재 멤버와 초대 후보가 합해 20명을 넘으면 제한을 초과한다', () => {
		expect(willExceedCologMemberLimit(19, 2)).toBe(true);
	});
});
