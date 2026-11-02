import 'server-only';

import type { SentrySlackBreadcrumb, SentrySlackSummary } from './sentry-slack-summary';

import { resolveSentrySlackMode } from './sentry-slack-mode';

export type SentrySlackAlertLevel = 'error' | 'warn' | 'info';

const ALERT_BADGE: Record<SentrySlackAlertLevel, '🔴' | '🟡' | '🟢'> = {
	error: '🔴',
	warn: '🟡',
	info: '🟢',
};

export function resolveSentrySlackAlertLevel(tags: Record<string, string>): SentrySlackAlertLevel {
	switch (tags.error_kind) {
		case 'network':
			return tags.user_impact === 'save_failed' || tags.user_impact === 'action_failed' ? 'warn' : 'info';
		case 'rate_limit':
		case 'timeout':
		case 'unknown':
			return 'warn';
		default:
			return 'error';
	}
}

function formatMainMessage(summary: SentrySlackSummary, eventUrl: string) {
	const alertLevel = resolveSentrySlackAlertLevel(summary.tags);
	const badge = ALERT_BADGE[alertLevel];
	const tags = Object.entries(summary.tags)
		.map(([key, value]) => `${key}: ${value}`)
		.join('\n');
	const request = summary.apiRequest
		? ['원인 요청', ...Object.entries(summary.apiRequest).map(([key, value]) => `${key}: ${value}`)].join('\n')
		: '';
	const title = summary.title.replace(/`/g, "'");
	const flow = summary.breadcrumbs.map(
		(breadcrumb, index) =>
			`직전 흐름 ${index + 1}\n${formatBreadcrumb(breadcrumb).slice(0, 2500).replace(/```/g, "'''")}`,
	);
	return {
		text: [
			`${badge} ${summary.errorType}`,
			summary.route,
			title,
			request,
			tags ? `\`\`\`${tags}\`\`\`` : '',
			`Sentry event ID: ${summary.eventId}`,
			`Sentry 이벤트: ${eventUrl}`,
			...flow,
			summary.sessionReplayUrl ? `PostHog session replay: ${summary.sessionReplayUrl}` : '',
		]
			.filter(Boolean)
			.join('\n'),
		blocks: [
			{ type: 'section', text: { type: 'mrkdwn', text: `${badge} *${summary.errorType}*` } },
			{
				type: 'section',
				text: { type: 'mrkdwn', text: summary.route === 'unknown' ? '경로 알 수 없음' : summary.route },
			},
			{ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${title}\`\`\`` } },
			...(request ? [{ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${request}\`\`\`` } }] : []),
			...(tags ? [{ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${tags}\`\`\`` } }] : []),
			{ type: 'context', elements: [{ type: 'mrkdwn', text: `Sentry event ID: \`${summary.eventId}\`` }] },
			{
				type: 'context',
				elements: [
					{
						type: 'mrkdwn',
						text: `<${eventUrl}|Sentry 이벤트 보기> · 서명된 Sentry alert`,
					},
				],
			},
			...flow.map((text) => ({ type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${text}\`\`\`` } })),
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

async function postSlackApi(body: unknown, token: string): Promise<{ ok: boolean }> {
	const response = await postWithRetry('https://slack.com/api/chat.postMessage', body, token);
	if (!response?.ok) return { ok: false };
	const data: unknown = await response.json();
	if (!data || typeof data !== 'object') return { ok: false };
	return { ok: 'ok' in data && data.ok === true };
}

export async function deliverSentrySlackAlert(summary: SentrySlackSummary, eventUrl: string): Promise<boolean> {
	if (resolveSentrySlackMode(process.env.SENTRY_SLACK_MODE) !== 'webhook') return false;
	const org = process.env.SENTRY_WEBHOOK_ORG;
	if (!org || !/^[a-z0-9_-]+$/.test(org) || !/^[a-f\d]{32}$/.test(summary.eventId)) return false;
	try {
		const url = new URL(eventUrl);
		if (
			url.origin !== `https://${org}.sentry.io` ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			!/^\/issues\/[1-9]\d*\/events\/[a-f\d]{32}\/$/.test(url.pathname) ||
			!url.pathname.endsWith(`/events/${summary.eventId}/`)
		)
			return false;
	} catch {
		return false;
	}
	const token = process.env.SENTRY_SLACK_BOT_TOKEN;
	const channel = process.env.SENTRY_SLACK_CHANNEL_ID;
	const webhook = process.env.SENTRY_SLACK_WEBHOOK_URL;
	if ((!token || !channel) && !webhook) return false;
	try {
		const main = formatMainMessage(summary, eventUrl);
		if (token && channel) {
			const result = await postSlackApi({ channel, ...main, unfurl_links: false }, token);
			if (result.ok) return true;
			console.error('Sentry Slack alert delivery failed.');
			return false;
		}
		if (!webhook) return false;
		const response = await postWithRetry(webhook, main);
		if (response?.ok) return true;
		console.error('Sentry Slack alert delivery failed:', response?.status);
	} catch {
		console.error('Sentry Slack alert delivery failed.');
	}
	return false;
}
