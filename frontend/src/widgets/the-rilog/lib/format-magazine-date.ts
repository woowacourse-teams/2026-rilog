export interface MagazineDate {
	label: string;
	dateTime: string;
}

const MAGAZINE_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	timeZone: 'Asia/Seoul',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

const MAGAZINE_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', {
	timeZone: 'Asia/Seoul',
	weekday: 'long',
	month: 'long',
});

export function formatMagazineDate(date: Date): MagazineDate {
	const calendarParts = MAGAZINE_DATE_FORMATTER.formatToParts(date);
	const year = calendarParts.find((part) => part.type === 'year')?.value ?? '';
	const month = calendarParts.find((part) => part.type === 'month')?.value ?? '';
	const day = calendarParts.find((part) => part.type === 'day')?.value ?? '';
	const labelParts = MAGAZINE_LABEL_FORMATTER.formatToParts(date);
	const weekday = labelParts.find((part) => part.type === 'weekday')?.value ?? '';
	const monthName = labelParts.find((part) => part.type === 'month')?.value.toLowerCase() ?? '';

	return {
		label: `${weekday} ${monthName} ${Number(day)} ${year}`,
		dateTime: `${year}-${month}-${day}`,
	};
}
