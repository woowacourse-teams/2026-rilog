import type { ErrorEvent } from '@sentry/nextjs';

export interface SentrySlackSummary {
	eventId: string;
	title: string;
	errorType: string;
	route: string;
	tags: Record<string, string>;
	breadcrumbs: string[];
}

const TAG_NAMES = [
	'operation',
	'report_source',
	'http_status',
	'error_code',
	'feature',
	'release',
	'environment',
] as const;
const SAFE_TAG = /^[\w.:-]{1,80}$/;
const EVENT_ID = /^[a-f\d]{32}$/i;
const ROUTES = new Set(['/', '/write', '/about', '/feed', '/login', '/search', '/settings']);
const ROUTE_TEMPLATE = /^\/(?:\[slug\](?:\/posts\/\[postId\](?:\/markdown)?)?)$/;

function safeRoute(event: ErrorEvent): string {
	for (const candidate of [event.transaction, event.request?.url]) {
		if (typeof candidate !== 'string') continue;
		try {
			const path = new URL(candidate, 'https://www.rilog.kr').pathname;
			if (ROUTES.has(path) || ROUTE_TEMPLATE.test(path)) return path;
		} catch {
			// Unknown SDK route data is not copied into Slack.
		}
	}
	return 'unknown';
}

function cleanText(value: string, limit: number): string {
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, '[URL]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/[<>@]/g, '')
		.replace(/[\r\n\t]/g, ' ')
		.slice(0, limit)
		.trim();
}

function summarizeBreadcrumb(breadcrumb: NonNullable<ErrorEvent['breadcrumbs']>[number]): string | null {
	const category = breadcrumb.category;
	if (!category || !/^(fetch|xhr|http|navigation|ui\.(click|input|submit))$/.test(category)) return null;
	// Navigation URLs and entered text can contain user content even after Sentry's general redaction.
	if (category === 'navigation') return 'navigation';
	if (category.startsWith('ui.')) {
		const element = breadcrumb.message?.match(/^(button|a|input|form|textarea|select|div|span)\b/i)?.[1];
		return [category, element?.toLowerCase()].filter(Boolean).join(' ');
	}
	const data = breadcrumb.data;
	const method: unknown = data?.method;
	const status: unknown = data?.status_code;
	const absoluteUrl = breadcrumb.message?.match(/https?:\/\/[^\s<>"']+/i)?.[0];
	let endpoint: string | undefined;
	if (absoluteUrl) {
		try {
			const url = new URL(absoluteUrl);
			if (url.hostname === 'api.rilog.kr') {
				const parts = url.pathname.split('/');
				if (parts[1] === 'v1' && /^[a-z-]+$/.test(parts[2] ?? '')) endpoint = `/v1/${parts[2]}`;
			}
		} catch {
			// Malformed SDK breadcrumb URLs do not affect the error event.
		}
	}
	const details = [
		typeof method === 'string' && /^[A-Z]{3,7}$/.test(method) ? method : null,
		endpoint,
		typeof status === 'number' && status >= 100 && status <= 599 ? String(status) : null,
	]
		.filter(Boolean)
		.join(' ');
	return [category, details].filter(Boolean).join(' ');
}

/** Build the only data allowed to leave the Sentry SDK for the Slack notifier. */
export function summarizeSentryEventForSlack(event: ErrorEvent): SentrySlackSummary | null {
	if (!event.event_id || !EVENT_ID.test(event.event_id)) return null;
	const errorType = cleanText(event.exception?.values?.at(-1)?.type ?? 'Error', 80) || 'Error';
	const title = cleanText(event.message ?? event.exception?.values?.at(-1)?.value ?? errorType, 180) || errorType;
	const tags: Record<string, string> = {};
	for (const name of TAG_NAMES) {
		const value = event.tags?.[name];
		if (typeof value === 'string' && SAFE_TAG.test(value)) tags[name] = value;
	}
	if (typeof event.release === 'string' && SAFE_TAG.test(event.release)) tags.release = event.release;
	if (typeof event.environment === 'string' && SAFE_TAG.test(event.environment)) tags.environment = event.environment;
	const breadcrumbs = (event.breadcrumbs ?? [])
		.map(summarizeBreadcrumb)
		.filter((item): item is string => Boolean(item))
		.slice(-3);
	return { eventId: event.event_id, title, errorType, route: safeRoute(event), tags, breadcrumbs };
}

export function parseSentrySlackSummary(value: unknown): SentrySlackSummary | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const data = value as Partial<SentrySlackSummary>;
	if (typeof data.eventId !== 'string' || !EVENT_ID.test(data.eventId)) return null;
	if (typeof data.title !== 'string' || !data.title || data.title.length > 180) return null;
	if (typeof data.errorType !== 'string' || !data.errorType || data.errorType.length > 80) return null;
	if (
		typeof data.route !== 'string' ||
		!(ROUTES.has(data.route) || ROUTE_TEMPLATE.test(data.route) || data.route === 'unknown')
	)
		return null;
	if (!data.tags || typeof data.tags !== 'object' || Array.isArray(data.tags)) return null;
	if (
		!Array.isArray(data.breadcrumbs) ||
		data.breadcrumbs.length > 3 ||
		!data.breadcrumbs.every((item) => typeof item === 'string' && item.length <= 140)
	)
		return null;
	if (
		Object.entries(data.tags).some(
			([name, item]) =>
				!TAG_NAMES.includes(name as (typeof TAG_NAMES)[number]) || typeof item !== 'string' || !SAFE_TAG.test(item),
		)
	)
		return null;
	return {
		eventId: data.eventId,
		title: cleanText(data.title, 180),
		errorType: cleanText(data.errorType, 80),
		route: data.route,
		tags: Object.fromEntries(Object.entries(data.tags)),
		breadcrumbs: data.breadcrumbs.map((item) => cleanText(item, 140)),
	};
}
