import { describe, expect, it } from 'vitest';

import { normalizeCologName, validateCologName } from './colog';

describe('normalizeCologName', () => {
	it('이름의 앞뒤 공백을 제거한다', () => {
		expect(normalizeCologName('  리로그  ')).toBe('리로그');
	});
});

describe('validateCologName', () => {
	it('앞뒤 공백을 제외한 이름 길이를 검증한다', () => {
		expect(validateCologName('  리로그  ')).toBeUndefined();
		expect(validateCologName(' R ')).toBe('팀 이름은 2~20자로 입력해 주세요.');
		expect(validateCologName('가'.repeat(21))).toBe('팀 이름은 2~20자로 입력해 주세요.');
	});
});
