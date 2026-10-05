import 'server-only';

import type { SentrySlackSummary } from './sentry-slack-summary';

const WINDOW_MS = 60_000;
const DUPLICATE_MS = 5 * 60_000;
const MAX_PER_IP = 10;
const MAX_TOTAL = 60;
const recentByIp = new Map<string, number[]>();
const recentTotal: number[] = [];
const duplicateUntil = new Map<string, number>();

function admit(source: string, summary: SentrySlackSummary, now: number): boolean {
	for (const [ip, times] of recentByIp) {
		const current = times.filter((time) => now - time < WINDOW_MS);
		if (current.length) recentByIp.set(ip, current);
		else recentByIp.delete(ip);
	}
	const ipTimes = (recentByIp.get(source) ?? []).filter((time) => now - time < WINDOW_MS);
	const totalTimes = recentTotal.filter((time) => now - time < WINDOW_MS);
	recentTotal.splice(0, recentTotal.length, ...totalTimes);
	for (const [key, until] of duplicateUntil) if (until <= now) duplicateUntil.delete(key);
	const key = [summary.errorType, summary.title, summary.tags.operation, summary.tags.http_status].join('|');
	if (duplicateUntil.has(key) || ipTimes.length >= MAX_PER_IP || recentTotal.length >= MAX_TOTAL) return false;
	ipTimes.push(now);
	recentByIp.set(source, ipTimes);
	recentTotal.push(now);
	duplicateUntil.set(key, now + DUPLICATE_MS);
	return true;
}

function formatSlackMessage(summary: SentrySlackSummary): string {
	const tags = Object.entries(summary.tags)
		.map(([key, value]) => `${key}=${value}`)
		.join(' · ');
	const breadcrumbs = summary.breadcrumbs.map((item) => `• ${item}`).join('\n');
	return [
		`[Rilog 오류] ${summary.errorType}: ${summary.title}`,
		tags,
		breadcrumbs ? `직전 흐름\n${breadcrumbs}` : '',
		`Sentry event ID: ${summary.eventId}`,
	]
		.filter(Boolean)
		.join('\n');
}

export async function deliverSentrySlackAlert(summary: SentrySlackSummary, source: string): Promise<void> {
	const url = process.env.SENTRY_SLACK_WEBHOOK_URL;
	if (!url || process.env.NODE_ENV !== 'production') return;
	const now = Date.now();
	if (!admit(source, summary, now)) return;
	try {
		const payload = JSON.stringify({ text: formatSlackMessage(summary) });
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: payload,
				signal: AbortSignal.timeout(2500),
			});
			if (response.ok) return;
			if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
				const retryAfter = Number(response.headers.get('retry-after') ?? 1);
				await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(retryAfter, 1), 5) * 1000));
				continue;
			}
			console.error('Sentry Slack alert delivery failed:', response.status);
		}
	} catch {
		console.error('Sentry Slack alert delivery failed.');
	}
}
