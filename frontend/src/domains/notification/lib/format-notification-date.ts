import { parseApiUtcDate } from '@/shared/utils/parse-api-utc-date';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_TIME_LIMIT_MS = 7 * DAY_MS;

const NOTIFICATION_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	timeZone: 'Asia/Seoul',
});

export function formatNotificationDate(createdAt: string): string {
	const date = parseApiUtcDate(createdAt);
	if (date === null) return '시간 정보 없음';

	const elapsedMs = Math.max(0, Date.now() - date.getTime());
	if (elapsedMs < MINUTE_MS) return '방금 전';
	if (elapsedMs < HOUR_MS) return `${Math.floor(elapsedMs / MINUTE_MS)}분 전`;
	if (elapsedMs < DAY_MS) return `${Math.floor(elapsedMs / HOUR_MS)}시간 전`;
	if (elapsedMs <= RELATIVE_TIME_LIMIT_MS) return `${Math.floor(elapsedMs / DAY_MS)}일 전`;

	return NOTIFICATION_DATE_FORMATTER.formatToParts(date)
		.map(({ type, value }) => {
			if (type === 'year') return `${value}년 `;
			if (type === 'month') return `${value}월 `;
			if (type === 'day') return `${value}일`;
			return '';
		})
		.join('');
}
