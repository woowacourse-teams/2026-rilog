import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatNotificationDate } from './format-notification-date';

describe('formatNotificationDate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it.each([
		['2026-10-09T12:00:00Z', '방금 전'],
		['2026-10-09T11:59:00.001Z', '방금 전'],
		['2026-10-09T11:59:00Z', '1분 전'],
		['2026-10-09T11:00:00.001Z', '59분 전'],
		['2026-10-09T11:00:00Z', '1시간 전'],
		['2026-10-08T12:00:00.001Z', '23시간 전'],
		['2026-10-08T12:00:00Z', '1일 전'],
		['2026-10-02T12:00:00.001Z', '6일 전'],
		['2026-10-02T12:00:00Z', '7일 전'],
		['2026-10-02T11:59:59.999Z', '2026년 10월 02일'],
	])('%s 알림은 경과 시간에 따라 %s로 표시한다', (createdAt, expected) => {
		expect(formatNotificationDate(createdAt)).toBe(expected);
	});

	it('7일을 초과한 알림은 한국 시간 기준 날짜를 두 자리 월·일로 표시한다', () => {
		expect(formatNotificationDate('2026-01-08T17:21:00Z')).toBe('2026년 01월 09일');
	});

	it('시간대가 없는 시각도 기존 API 날짜 규칙에 따라 UTC로 해석한다', () => {
		expect(formatNotificationDate('2026-10-09T11:59:00')).toBe('1분 전');
	});

	it('미래 시각은 음수 상대 시간 대신 방금 전으로 표시한다', () => {
		expect(formatNotificationDate('2026-10-09T12:01:00Z')).toBe('방금 전');
	});

	it('잘못된 날짜를 받으면 잘못된 시각 대신 안내를 표시한다', () => {
		expect(formatNotificationDate('invalid')).toBe('시간 정보 없음');
	});
});
