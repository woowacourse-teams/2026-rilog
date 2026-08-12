import { describe, expect, it } from 'vitest';

import { getTextLength } from './get-text-length';

describe('getTextLength', () => {
	it.each([
		{ value: undefined, expectedLength: 0 },
		{ value: '', expectedLength: 0 },
		{ value: '기록하기', expectedLength: 4 },
		{ value: 2026, expectedLength: 4 },
	])('$value의 문자열 길이로 $expectedLength를 반환한다', ({ value, expectedLength }) => {
		expect(getTextLength(value)).toBe(expectedLength);
	});
});
