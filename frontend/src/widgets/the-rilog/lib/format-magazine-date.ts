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

export function formatMagazineDate(date: Date): MagazineDate {
	const calendarParts = MAGAZINE_DATE_FORMATTER.formatToParts(date);
	const year = calendarParts.find((part) => part.type === 'year')?.value ?? '';
	const month = calendarParts.find((part) => part.type === 'month')?.value ?? '';
	const day = calendarParts.find((part) => part.type === 'day')?.value ?? '';

	return {
		label: `${year}.${month}.${day}`,
		dateTime: `${year}-${month}-${day}`,
	};
}
