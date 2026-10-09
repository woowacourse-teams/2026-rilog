import { parseApiUtcDate } from '@/shared/utils/parse-api-utc-date';

const NOTIFICATION_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
	timeZone: 'Asia/Seoul',
});

export function formatNotificationDate(createdAt: string): string {
	const date = parseApiUtcDate(createdAt);
	return date === null ? '시간 정보 없음' : NOTIFICATION_DATE_FORMATTER.format(date);
}
