const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/;

export function formatPublishedDate(publishedAt: string, isMobile = false): string {
	const match = DATE_PATTERN.exec(publishedAt);

	if (match === null) {
		return publishedAt;
	}

	const [, year, month, day] = match;

	if (isMobile) {
		return `${year}.${Number(month)}.${Number(day)}`;
	}

	return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
