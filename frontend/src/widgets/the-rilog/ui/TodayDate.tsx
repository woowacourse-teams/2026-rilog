'use client';

import { useSyncExternalStore } from 'react';

import { formatMagazineDate } from '../lib/format-magazine-date';

import styles from './the-rilog-magazine.module.css';

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const SEOUL_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1000;

function subscribeToToday(onChange: () => void) {
	let timer: ReturnType<typeof setTimeout>;
	const refresh = () => {
		clearTimeout(timer);
		onChange();
		const seoulMilliseconds = Date.now() + SEOUL_OFFSET_MILLISECONDS;
		const untilMidnight = DAY_MILLISECONDS - (seoulMilliseconds % DAY_MILLISECONDS);
		timer = setTimeout(refresh, untilMidnight);
	};
	const refreshWhenVisible = () => {
		if (document.visibilityState === 'visible') refresh();
	};
	refresh();
	window.addEventListener('focus', refresh);
	document.addEventListener('visibilitychange', refreshWhenVisible);
	return () => {
		clearTimeout(timer);
		window.removeEventListener('focus', refresh);
		document.removeEventListener('visibilitychange', refreshWhenVisible);
	};
}

function readToday() {
	return formatMagazineDate(new Date()).dateTime;
}

function readServerToday() {
	return '';
}

export default function TodayDate() {
	const dateTime = useSyncExternalStore(subscribeToToday, readToday, readServerToday);
	const label = dateTime ? formatMagazineDate(new Date(`${dateTime}T00:00:00+09:00`)).label : '\u00a0';
	return (
		<div className={styles.edition} aria-label="오늘 날짜">
			<time dateTime={dateTime || undefined}>{label}</time>
		</div>
	);
}
