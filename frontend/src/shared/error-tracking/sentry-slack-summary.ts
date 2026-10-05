import type { ErrorEvent } from '@sentry/nextjs';

interface JsonObject {
	[key: string]: JsonValue;
}

type JsonValue = boolean | JsonObject | JsonValue[] | null | number | string;

export interface SentrySlackBreadcrumb {
	category?: string;
	data?: JsonObject;
	level?: string;
	message?: string;
	timestamp?: number;
	type?: string;
}

export interface SentrySlackSummary {
	eventId: string;
	title: string;
	errorType: string;
	route: string;
	tags: Record<string, string>;
	breadcrumbs: SentrySlackBreadcrumb[];
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
const BREADCRUMB_KEYS = new Set(['category', 'data', 'level', 'message', 'timestamp', 'type']);
const PRIVATE_KEY =
	/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-amz-.*|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|body|content)$/i;
const PRIVATE_QUERY_KEY =
	/^(code|state|password|client_secret|api_key|token|access_token|refresh_token|id_token|signature|nickname|email|filename|title|content|x-amz-.*)$/i;

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

function safeUrl(value: string): string {
	try {
		const url = new URL(value);
		url.username = '';
		url.password = '';
		url.hash = '';
		for (const key of url.searchParams.keys()) {
			if (PRIVATE_QUERY_KEY.test(key)) url.searchParams.delete(key);
		}
		return url.toString();
	} catch {
		return value;
	}
}

function safeApiUrl(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || !['api.rilog.kr', 'api.rilog.test'].includes(url.hostname)) return null;
		if (url.username || url.password) return null;
		return `${url.origin}${url.pathname}`;
	} catch {
		return null;
	}
}

function cleanText(value: string, limit: number): string {
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, (url) => safeApiUrl(url) ?? '[URL]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/[<>@]/g, '')
		.replace(/[\r\n\t]/g, ' ')
		.slice(0, limit)
		.trim();
}

function cleanDiagnosticText(value: string): string {
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, safeUrl)
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/\b(value=)[^\]\s]+/gi, '$1[Filtered]')
		.replace(/```/g, "''' ");
}

function sanitizeJson(value: unknown, depth = 0): JsonValue | undefined {
	if (typeof value === 'string') return cleanDiagnosticText(value);
	if (typeof value === 'boolean' || typeof value === 'number' || value === null) return value;
	if (depth >= 8 || typeof value !== 'object') return undefined;
	if (Array.isArray(value)) {
		return value.flatMap((item) => {
			const sanitized = sanitizeJson(item, depth + 1);
			return sanitized === undefined ? [] : [sanitized];
		});
	}
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => {
			if (PRIVATE_KEY.test(key)) return [];
			const sanitized = sanitizeJson(item, depth + 1);
			return sanitized === undefined ? [] : [[key, sanitized]];
		}),
	);
}

function sanitizeBreadcrumb(value: unknown): SentrySlackBreadcrumb | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	if (Object.keys(value).some((key) => !BREADCRUMB_KEYS.has(key))) return null;
	const item = value as Record<string, unknown>;
	const breadcrumb: SentrySlackBreadcrumb = {};
	for (const key of ['category', 'level', 'message', 'type'] as const) {
		if (item[key] === undefined) continue;
		if (typeof item[key] !== 'string') return null;
		breadcrumb[key] = cleanDiagnosticText(item[key]);
	}
	if (item.timestamp !== undefined) {
		if (typeof item.timestamp !== 'number' || !Number.isFinite(item.timestamp)) return null;
		breadcrumb.timestamp = item.timestamp;
	}
	if (item.data !== undefined) {
		const data = sanitizeJson(item.data);
		if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
		breadcrumb.data = data;
	}
	return Object.keys(breadcrumb).length > 0 && JSON.stringify(breadcrumb).length <= 3000 ? breadcrumb : null;
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
		.map(sanitizeBreadcrumb)
		.filter((item): item is SentrySlackBreadcrumb => item !== null)
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
	if (!Array.isArray(data.breadcrumbs) || data.breadcrumbs.length > 3) return null;
	const breadcrumbs = data.breadcrumbs.map(sanitizeBreadcrumb);
	if (breadcrumbs.some((item) => item === null)) return null;
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
		breadcrumbs: breadcrumbs.filter((item): item is SentrySlackBreadcrumb => item !== null),
	};
}
