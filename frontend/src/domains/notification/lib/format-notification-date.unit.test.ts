import { describe, expect, it } from 'vitest';

import { formatNotificationDate } from './format-notification-date';

describe('formatNotificationDate', () => {
	it('UTC 알림 시각을 한국 시각의 날짜와 분까지 표시한다', () => {
		expect(formatNotificationDate('2026-10-08T17:21:00Z')).toBe('2026년 10월 9일 02:21');
	});

	it('시간대가 없는 시각도 기존 API 날짜 규칙에 따라 UTC로 해석한다', () => {
		expect(formatNotificationDate('2026-10-08T08:21:00')).toBe('2026년 10월 8일 17:21');
	});

	it('잘못된 날짜를 받으면 잘못된 시각 대신 안내를 표시한다', () => {
		expect(formatNotificationDate('invalid')).toBe('시간 정보 없음');
	});
});
