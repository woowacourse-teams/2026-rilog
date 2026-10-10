import { describe, expect, it } from 'vitest';

import { formatMagazineDate } from './format-magazine-date';

describe('formatMagazineDate', () => {
	it.each([
		['2026-10-04T14:59:59Z', '2026.10.04', '2026-10-04'],
		['2026-10-04T15:00:00Z', '2026.10.05', '2026-10-05'],
		['2026-10-31T15:00:00Z', '2026.11.01', '2026-11-01'],
		['2026-12-31T14:59:59Z', '2026.12.31', '2026-12-31'],
		['2026-12-31T15:00:00Z', '2027.01.01', '2027-01-01'],
		['2027-01-09T15:00:00Z', '2027.01.10', '2027-01-10'],
	])('%s를 표시하면 한국 날짜 %s와 일치하는 dateTime을 반환한다', (instant, label, dateTime) => {
		expect(formatMagazineDate(new Date(instant))).toEqual({ label, dateTime });
	});

	it('같은 인스턴스의 모듈에서 날짜를 다시 계산하면 새 요청의 날짜를 반환한다', () => {
		expect(formatMagazineDate(new Date('2026-10-04T14:59:59Z')).label).toBe('2026.10.04');
		expect(formatMagazineDate(new Date('2026-10-04T15:00:00Z')).label).toBe('2026.10.05');
	});
});
