import { describe, expect, it } from 'vitest';

import { canAccessRilogSettings } from './can-access-rilog-settings';

describe('canAccessRilogSettings', () => {
	it('현재 사용자 slug와 공개 프로필 slug가 같을 때만 접근을 허용한다', () => {
		expect(canAccessRilogSettings('@rilogger', 'rilogger')).toBe(true);
		expect(canAccessRilogSettings('rilogger', '@another')).toBe(false);
	});
});
