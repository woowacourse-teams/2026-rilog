import type { SentrySlackSummary } from './sentry-slack-summary';

export function notifySlackFromBrowser(summary: SentrySlackSummary): void {
	try {
		void fetch('/api/observability/sentry-slack', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(summary),
			credentials: 'omit',
			keepalive: true,
		}).catch(() => undefined);
	} catch {
		// Slack delivery must never interrupt the Sentry SDK.
	}
}

export function notifySlackFromEdge(summary: SentrySlackSummary): void {
	const site = process.env.NEXT_PUBLIC_SITE_URL;
	if (!site) return;
	try {
		void fetch(new URL('/api/observability/sentry-slack', site), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Origin: new URL(site).origin },
			body: JSON.stringify(summary),
		}).catch(() => undefined);
	} catch {
		// Edge alert failures must not interrupt Sentry capture.
	}
}
