const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMEZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

export function parseApiUtcDate(value: string): Date | null {
	const normalizedValue = value.trim();
	if (normalizedValue === '') {
		return null;
	}

	const utcValue = DATE_ONLY_PATTERN.test(normalizedValue)
		? `${normalizedValue}T00:00:00Z`
		: `${normalizedValue}${TIMEZONE_PATTERN.test(normalizedValue) ? '' : 'Z'}`;
	const date = new Date(utcValue);

	return Number.isNaN(date.getTime()) ? null : date;
}

export function toApiUtcISOString(value: string): string {
	return parseApiUtcDate(value)?.toISOString() ?? value;
}
