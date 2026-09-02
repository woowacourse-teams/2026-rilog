import { describe, expect, it } from 'vitest';

import { formatPublishedDate } from './format-published-date';

describe('formatPublishedDate', () => {
	it('API 날짜를 한국어 연월일로 표시한다', () => {
		expect(formatPublishedDate('2026-08-04T23:59:59')).toBe('2026년 8월 5일');
		expect(formatPublishedDate('2026-12-31T23:30:00Z')).toBe('2027년 1월 1일');
		expect(formatPublishedDate('2027-01-01T08:30:00+09:00')).toBe('2027년 1월 1일');
	});

	it('모바일 포맷은 점 구분 형식으로 표시한다', () => {
		expect(formatPublishedDate('2026-08-04T23:59:59', true)).toBe('2026.8.5');
	});

	it('날짜 형식이 올바르지 않으면 원문을 보존한다', () => {
		expect(formatPublishedDate('방금 전')).toBe('방금 전');
	});
});
