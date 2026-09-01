import { describe, expect, it } from 'vitest';

import { parseApiUtcDate, toApiUtcISOString } from './parse-api-utc-date';

describe('parseApiUtcDate', () => {
	it('오프셋 없는 API 날짜를 UTC로 해석한다', () => {
		expect(parseApiUtcDate('2026-08-04T23:59:59')?.toISOString()).toBe('2026-08-04T23:59:59.000Z');
	});

	it('명시된 Z와 offset을 같은 instant로 보존한다', () => {
		expect(parseApiUtcDate('2026-12-31T23:30:00Z')?.toISOString()).toBe('2026-12-31T23:30:00.000Z');
		expect(parseApiUtcDate('2027-01-01T08:30:00+09:00')?.toISOString()).toBe('2026-12-31T23:30:00.000Z');
		expect(parseApiUtcDate('2026-12-31T15:30:00-08:00')?.toISOString()).toBe('2026-12-31T23:30:00.000Z');
	});

	it('소수 초와 date-only 값을 지원한다', () => {
		expect(parseApiUtcDate('2026-08-04T23:59:59.123456')?.toISOString()).toBe('2026-08-04T23:59:59.123Z');
		expect(parseApiUtcDate('2026-08-04')?.toISOString()).toBe('2026-08-04T00:00:00.000Z');
	});

	it('유효하지 않은 값은 실패 결과를 반환한다', () => {
		expect(parseApiUtcDate('방금 전')).toBeNull();
		expect(parseApiUtcDate('')).toBeNull();
	});
});

describe('toApiUtcISOString', () => {
	it('유효한 날짜는 UTC ISO로 정규화하고 실패하면 원문을 보존한다', () => {
		expect(toApiUtcISOString('2026-08-04T23:59:59')).toBe('2026-08-04T23:59:59.000Z');
		expect(toApiUtcISOString('방금 전')).toBe('방금 전');
	});
});
