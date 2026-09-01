import { parseApiUtcDate } from '@/shared/utils/parse-api-utc-date';

const PUBLISHED_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	timeZone: 'Asia/Seoul',
});

export function formatPublishedDate(publishedAt: string, isMobile = false): string {
	const date = parseApiUtcDate(publishedAt);

	if (date === null) {
		return publishedAt;
	}

	const dateParts = PUBLISHED_DATE_FORMATTER.formatToParts(date);
	const year = dateParts.find(({ type }) => type === 'year')?.value;
	const month = dateParts.find(({ type }) => type === 'month')?.value;
	const day = dateParts.find(({ type }) => type === 'day')?.value;

	if (!year || !month || !day) {
		return publishedAt;
	}

	if (isMobile) {
		return `${year}.${month}.${day}`;
	}

	return `${year}년 ${month}월 ${day}일`;
}
