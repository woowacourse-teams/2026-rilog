const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/;

export const formatPublishedDateMobile = (publishedAt: string): string => {
	const match = DATE_PATTERN.exec(publishedAt);

	if (match === null) {
		return publishedAt;
	}

	const [, year, month, day] = match;

	return `${year}.${Number(month)}.${Number(day)}`;
};
