import type { SentrySlackSummary } from './sentry-slack-summary';

import { resolveSentrySlackMode } from './sentry-slack-mode';

export function notifySlackFromBrowser(summary: SentrySlackSummary): void {
	if (resolveSentrySlackMode(process.env.NEXT_PUBLIC_SENTRY_SLACK_MODE) !== 'legacy') return;
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
	if (resolveSentrySlackMode(process.env.NEXT_PUBLIC_SENTRY_SLACK_MODE) !== 'legacy') return;
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
