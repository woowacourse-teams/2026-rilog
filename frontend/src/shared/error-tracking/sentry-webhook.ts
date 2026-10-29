import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ErrorEvent } from '@sentry/nextjs';

import { summarizeSentryEventForSlack } from './sentry-slack-summary';

function record(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? Object.fromEntries(Object.entries(value))
		: undefined;
}

function text(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function tags(value: unknown): Record<string, string> {
	const entries: unknown[] = Array.isArray(value) ? value : Object.entries(record(value) ?? {});
	return Object.fromEntries(
		entries.flatMap((entry) =>
			Array.isArray(entry) && typeof entry[0] === 'string' && typeof entry[1] === 'string'
				? [[entry[0], entry[1]]]
				: [],
		),
	);
}

function breadcrumbs(value: unknown): NonNullable<ErrorEvent['breadcrumbs']> {
	const values = Array.isArray(value) ? value : record(value)?.values;
	if (!Array.isArray(values)) return [];
	return values.flatMap((item) => {
		const crumb = record(item);
		if (!crumb || typeof crumb.category !== 'string') return [];
		const data = record(crumb.data);
		return [
			{
				category: crumb.category,
				message: text(crumb.message),
				data: {
					method: text(data?.method),
					url: text(data?.url),
					from: text(data?.from),
					to: text(data?.to),
					status_code: typeof data?.status_code === 'number' ? data.status_code : undefined,
				},
			},
		];
	});
}

export function verifySentryWebhookSignature(body: Uint8Array, signature: string | null, secret: string): boolean {
	if (!secret || !signature || !/^[a-f\d]{64}$/i.test(signature)) return false;
	const expected = createHmac('sha256', secret).update(body).digest();
	return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export interface SentryWebhookTarget {
	projectId: string;
	org: string;
	environment: 'prod' | 'smoke';
}

/** Construct only the SDK fields consumed by the existing Slack privacy boundary. */
export function parseSentryWebhook(payload: unknown, target: SentryWebhookTarget) {
	const root = record(payload);
	if (!root || typeof root.action !== 'string') return { kind: 'invalid' } as const;
	if (root.action !== 'triggered') return { kind: 'ignored' } as const;
	const event = record(record(root.data)?.event);
	if (!event) return { kind: 'invalid' } as const;
	if (String(event.project) !== target.projectId) return { kind: 'ignored' } as const;
	const eventTags = tags(event.tags);
	// Sentry normalizes spaces in persisted tag keys.
	const replayUrl = eventTags['PostHog Recording URL'] ?? eventTags['PostHog-Recording-URL'];
	if (replayUrl) eventTags['PostHog Recording URL'] = replayUrl;
	const environment = text(event.environment) ?? eventTags.environment;
	const release = text(event.release) ?? text(record(event.release)?.version);
	if (
		environment !== target.environment ||
		(target.environment === 'prod' && release?.startsWith('sourcemap-smoke-')) ||
		(event.level !== 'error' && event.level !== 'fatal')
	)
		return { kind: 'ignored' } as const;
	const eventId = text(event.event_id);
	const issueId = text(event.issue_id);
	if (!eventId || !/^[a-f\d]{32}$/i.test(eventId) || !issueId || !/^[1-9]\d*$/.test(issueId)) {
		return { kind: 'invalid' } as const;
	}
	const values = record(event.exception)?.values;
	const exception = record(Array.isArray(values) ? values.at(-1) : undefined);
	const metadata = record(event.metadata);
	const safeEvent: ErrorEvent = {
		type: undefined,
		event_id: eventId.toLowerCase(),
		environment,
		release,
		level: event.level,
		transaction: text(event.transaction),
		message: text(event.message) || undefined,
		request: { url: text(record(event.request)?.url) },
		tags: eventTags,
		exception: {
			values: [
				{
					type: text(exception?.type) ?? text(metadata?.type) ?? 'Error',
					value: text(exception?.value) ?? text(metadata?.value) ?? 'Sentry error alert',
				},
			],
		},
		breadcrumbs: breadcrumbs(event.breadcrumbs),
	};
	const summary = summarizeSentryEventForSlack(safeEvent);
	if (!summary) return { kind: 'invalid' } as const;
	return {
		kind: 'ready',
		summary,
		key: `${target.projectId}-${summary.eventId}`,
		eventUrl: `https://${target.org}.sentry.io/issues/${issueId}/events/${summary.eventId}/`,
	} as const;
}
