import 'server-only';

import type { SentrySlackBreadcrumb, SentrySlackSummary } from './sentry-slack-summary';

const WINDOW_MS = 60_000;
const DUPLICATE_MS = 5 * 60_000;
const MAX_PER_IP = 10;
const MAX_TOTAL = 60;
const recentByIp = new Map<string, number[]>();
const recentTotal: number[] = [];
const duplicateUntil = new Map<string, number>();

function admit(source: string, summary: SentrySlackSummary, now: number): { key: string; until: number } | null {
	for (const [ip, times] of recentByIp) {
		const current = times.filter((time) => now - time < WINDOW_MS);
		if (current.length) recentByIp.set(ip, current);
		else recentByIp.delete(ip);
	}
	const ipTimes = (recentByIp.get(source) ?? []).filter((time) => now - time < WINDOW_MS);
	const totalTimes = recentTotal.filter((time) => now - time < WINDOW_MS);
	recentTotal.splice(0, recentTotal.length, ...totalTimes);
	for (const [key, until] of duplicateUntil) if (until <= now) duplicateUntil.delete(key);
	const key = [summary.errorType, summary.title, summary.route, summary.tags.operation, summary.tags.http_status].join(
		'|',
	);
	if (duplicateUntil.has(key) || ipTimes.length >= MAX_PER_IP || recentTotal.length >= MAX_TOTAL) return null;
	ipTimes.push(now);
	recentByIp.set(source, ipTimes);
	recentTotal.push(now);
	const until = now + DUPLICATE_MS;
	duplicateUntil.set(key, until);
	return { key, until };
}

function formatMainMessage(summary: SentrySlackSummary) {
	const tags = Object.entries(summary.tags)
		.map(([key, value]) => `${key}: ${value}`)
		.join('\n');
	const title = summary.title.replace(/`/g, "'");
	return {
		text: [
			`🔴 ${summary.errorType}`,
			summary.route,
			title,
			tags ? `\`\`\`${tags}\`\`\`` : '',
			`Sentry event ID: ${summary.eventId}`,
			summary.sessionReplayUrl ? `PostHog session replay: ${summary.sessionReplayUrl}` : '',
		]
			.filter(Boolean)
			.join('\n'),
		blocks: [
			{ type: 'section', text: { type: 'mrkdwn', text: `🔴 *${summary.errorType}*` } },
			{
				type: 'section',
				text: { type: 'mrkdwn', text: summary.route === 'unknown' ? '경로 알 수 없음' : summary.route },
			},
			{ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${title}\`\`\`` } },
			...(tags ? [{ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${tags}\`\`\`` } }] : []),
			{ type: 'context', elements: [{ type: 'mrkdwn', text: `Sentry event ID: \`${summary.eventId}\`` }] },
			...(summary.sessionReplayUrl
				? [
						{
							type: 'section',
							text: { type: 'mrkdwn', text: `<${summary.sessionReplayUrl}|PostHog session replay 보기>` },
						},
					]
				: []),
		],
	};
}

function formatBreadcrumb(breadcrumb: SentrySlackBreadcrumb): string {
	const lines = [`category: ${breadcrumb.category}`];
	for (const [key, value] of [
		['method', breadcrumb.method],
		['url', breadcrumb.url],
		['status_code', breadcrumb.statusCode],
		['from', breadcrumb.from],
		['to', breadcrumb.to],
		['element', breadcrumb.element],
		['selector', breadcrumb.selector],
	] as const) {
		if (value !== undefined) lines.push(`${key}: ${value}`);
	}
	if (breadcrumb.attributes) {
		lines.push('attributes:');
		for (const [name, value] of Object.entries(breadcrumb.attributes)) lines.push(`  ${name}: ${value}`);
	}
	return lines.join('\n');
}

function retryAfterMs(response: Response): number {
	const value = response.headers.get('retry-after');
	if (value === null) return 1000;
	const seconds = Number(value);
	if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
	const retryAt = Date.parse(value);
	return Number.isFinite(retryAt) ? Math.max(retryAt - Date.now(), 0) : 1000;
}

async function postWithRetry(url: string, body: unknown, token?: string): Promise<Response | null> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(2500),
		});
		if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
			await new Promise((resolve) => setTimeout(resolve, retryAfterMs(response)));
			continue;
		}
		return response;
	}
	return null;
}

async function postSlackApi(body: unknown, token: string): Promise<{ ok: boolean; ts?: string }> {
	const response = await postWithRetry('https://slack.com/api/chat.postMessage', body, token);
	if (!response?.ok) return { ok: false };
	const data: unknown = await response.json();
	if (!data || typeof data !== 'object') return { ok: false };
	const result = data as { ok?: unknown; ts?: unknown };
	return { ok: result.ok === true, ts: typeof result.ts === 'string' ? result.ts : undefined };
}

export async function deliverSentrySlackAlert(summary: SentrySlackSummary, source: string): Promise<boolean> {
	if (process.env.NODE_ENV !== 'production') return false;
	const token = process.env.SENTRY_SLACK_BOT_TOKEN;
	const channel = process.env.SENTRY_SLACK_CHANNEL_ID;
	const webhook = process.env.SENTRY_SLACK_WEBHOOK_URL;
	if ((!token || !channel) && !webhook) return false;
	const admission = admit(source, summary, Date.now());
	if (!admission) return true;
	let mainDelivered = false;
	try {
		const main = formatMainMessage(summary);
		if (token && channel) {
			const parent = await postSlackApi({ channel, ...main, unfurl_links: false }, token);
			if (!parent.ok || !parent.ts) {
				console.error('Sentry Slack parent alert delivery failed.');
				return false;
			}
			mainDelivered = true;
			let repliesDelivered = true;
			for (const [index, breadcrumb] of summary.breadcrumbs.entries()) {
				// Slack generally allows one channel message per second, including thread replies.
				await new Promise((resolve) => setTimeout(resolve, 1100));
				const reply = await postSlackApi(
					{
						channel,
						thread_ts: parent.ts,
						reply_broadcast: false,
						text: `*직전 흐름 ${index + 1}/${summary.breadcrumbs.length}*\n\`\`\`${formatBreadcrumb(breadcrumb)}\`\`\``,
					},
					token,
				);
				if (!reply.ok) {
					console.error('Sentry Slack breadcrumb reply delivery failed.');
					repliesDelivered = false;
				}
			}
			return repliesDelivered;
		}
		if (!webhook) return false;
		const response = await postWithRetry(webhook, main);
		if (response?.ok) {
			mainDelivered = true;
			return true;
		}
		console.error('Sentry Slack alert delivery failed:', response?.status);
	} catch {
		console.error('Sentry Slack alert delivery failed.');
	} finally {
		if (!mainDelivered && duplicateUntil.get(admission.key) === admission.until) {
			duplicateUntil.delete(admission.key);
		}
	}
	return false;
}
