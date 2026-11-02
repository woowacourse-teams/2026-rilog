import type { ErrorEvent } from '@sentry/nextjs';

import { safeDiagnosticUrl, safePostHogReplayUrl, safeUiDetails } from './sentry-diagnostic-privacy';
import { normalizeSentryRoute } from './sentry-route';

export interface SentrySlackBreadcrumb {
	category: string;
	method?: string;
	url?: string;
	statusCode?: number;
	from?: string;
	to?: string;
	element?: string;
	selector?: string;
	attributes?: Record<string, string>;
}

export interface SentrySlackApiRequest {
	method: string;
	url?: string;
	statusCode?: number;
	requestId?: string;
}

export interface SentrySlackSummary {
	eventId: string;
	title: string;
	errorType: string;
	route: string;
	tags: Record<string, string>;
	breadcrumbs: SentrySlackBreadcrumb[];
	sessionReplayUrl?: string;
	apiRequest?: SentrySlackApiRequest;
}

const TAG_NAMES = [
	'operation',
	'error_kind',
	'user_impact',
	'runtime',
	'report_source',
	'http_status',
	'error_code',
	'feature',
	'release',
	'environment',
] as const;
const SAFE_TAG = /^[\w.:-]{1,80}$/;
const EVENT_ID = /^[a-f\d]{32}$/i;
const ROUTE_BASE_URL = 'https://www.rilog.kr';
const BREADCRUMB_CATEGORIES = /^(fetch|xhr|http|navigation|ui\.(click|input|submit))$/;
function safeRoute(event: ErrorEvent): string {
	for (const candidate of [event.transaction, event.request?.url]) {
		if (typeof candidate !== 'string') continue;
		try {
			const route = normalizeSentryRoute(new URL(candidate, ROUTE_BASE_URL).pathname);
			if (route) return route;
		} catch {
			// Unknown SDK route data is not copied into Slack.
		}
	}
	return 'unknown';
}

const safeUrl = safeDiagnosticUrl;

function safeApiUrl(value: string): string | null {
	try {
		if (!['https://api.rilog.kr', 'https://api.rilog.test'].includes(new URL(value).origin)) return null;
	} catch {
		return null;
	}
	return safeDiagnosticUrl(value)?.split('?')[0] ?? null;
}

const HTTP_METHOD = /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/;
const REQUEST_ID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;

function diagnosticApiUrl(value: string): string | null {
	const safe = safeApiUrl(value);
	if (!safe || safe.length > 600) return null;
	const url = new URL(safe);
	if (!['https://api.rilog.kr', 'https://api.rilog.test'].includes(url.origin)) return null;
	// Normalize numeric/UUID path identifiers; queries and fragments were already removed.
	const path = url.pathname
		.split('/')
		.map((segment) => (/^\d+$/.test(segment) || REQUEST_ID.test(segment) ? '[id]' : segment))
		.join('/');
	return `${url.origin}${path}`;
}

function summarizeApiRequest(event: ErrorEvent): SentrySlackApiRequest | undefined {
	const request = event.contexts?.api_request;
	if (!request || typeof request.method !== 'string' || !HTTP_METHOD.test(request.method)) return undefined;
	const url = typeof request.url === 'string' ? diagnosticApiUrl(request.url) : null;
	const status = event.tags?.http_status;
	const requestId = event.tags?.request_id;
	return {
		method: request.method,
		...(url ? { url } : {}),
		...(typeof status === 'string' && /^[1-5]\d{2}$/.test(status) ? { statusCode: Number(status) } : {}),
		...(typeof requestId === 'string' && REQUEST_ID.test(requestId) ? { requestId } : {}),
	};
}

function parseApiRequest(value: unknown): SentrySlackApiRequest | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const request = value as Partial<SentrySlackApiRequest>;
	if (Object.keys(value).some((key) => !['method', 'url', 'statusCode', 'requestId'].includes(key))) return null;
	if (typeof request.method !== 'string' || !HTTP_METHOD.test(request.method)) return null;
	if (request.url !== undefined && (typeof request.url !== 'string' || !diagnosticApiUrl(request.url))) return null;
	if (request.requestId !== undefined && (typeof request.requestId !== 'string' || !REQUEST_ID.test(request.requestId)))
		return null;
	if (
		request.statusCode !== undefined &&
		(typeof request.statusCode !== 'number' ||
			!Number.isInteger(request.statusCode) ||
			request.statusCode < 100 ||
			request.statusCode > 599)
	)
		return null;
	return {
		method: request.method,
		...(request.url ? { url: diagnosticApiUrl(request.url) as string } : {}),
		...(request.statusCode !== undefined ? { statusCode: request.statusCode } : {}),
		...(request.requestId ? { requestId: request.requestId } : {}),
	};
}

function cleanText(value: string, limit: number): string {
	return value
		.replace(
			/https?:\/\/[^\s<>"']+|(?<![\w:/])\/[^\s<>"']*[?#][^\s<>"']*/gi,
			(url) => safeApiUrl(url) ?? safeUrl(url) ?? '[URL]',
		)
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\b[^\s/\\]+\.(?:png|jpe?g|gif|webp|heic|pdf|docx?|txt|csv|zip)\b/gi, '[File]')
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[Token]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\bvalue=(?:"[^"]*"|'[^']*'|[^\]\s]+)/gi, 'value=[Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/[<>@]/g, '')
		.replace(/[\r\n\t]/g, ' ')
		.slice(0, limit)
		.trim();
}

const uiDetails = safeUiDetails;

function summarizeBreadcrumb(breadcrumb: NonNullable<ErrorEvent['breadcrumbs']>[number]): SentrySlackBreadcrumb | null {
	const category = breadcrumb.category;
	if (!category || !BREADCRUMB_CATEGORIES.test(category)) return null;
	const data = breadcrumb.data;
	if (category.startsWith('ui.')) {
		return { category, ...(breadcrumb.message ? uiDetails(breadcrumb.message) : {}) };
	}
	if (category === 'navigation') {
		const from = typeof data?.from === 'string' ? (safeUrl(data.from) ?? '[URL]') : undefined;
		const to = typeof data?.to === 'string' ? (safeUrl(data.to) ?? '[URL]') : undefined;
		return { category, ...(from ? { from } : {}), ...(to ? { to } : {}) };
	}
	const method = typeof data?.method === 'string' && /^[A-Z]{3,7}$/.test(data.method) ? data.method : undefined;
	const messageUrl = breadcrumb.message?.match(/https?:\/\/[^\s<>"']+/i)?.[0];
	const url = safeUrl(typeof data?.url === 'string' ? data.url : (messageUrl ?? '')) ?? undefined;
	const statusCode =
		typeof data?.status_code === 'number' && data.status_code >= 100 && data.status_code <= 599
			? data.status_code
			: undefined;
	return { category, ...(method ? { method } : {}), ...(url ? { url } : {}), ...(statusCode ? { statusCode } : {}) };
}

function parseBreadcrumb(value: unknown): SentrySlackBreadcrumb | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const item = value as Partial<SentrySlackBreadcrumb>;
	if (typeof item.category !== 'string' || !BREADCRUMB_CATEGORIES.test(item.category)) return null;
	const allowed = new Set(
		item.category.startsWith('ui.')
			? ['category', 'element', 'selector', 'attributes']
			: item.category === 'navigation'
				? ['category', 'from', 'to']
				: ['category', 'method', 'url', 'statusCode'],
	);
	if (Object.keys(value).some((key) => !allowed.has(key))) return null;
	if (item.category.startsWith('ui.')) {
		if (item.element !== undefined && (typeof item.element !== 'string' || !/^[a-z][\w-]*$/i.test(item.element)))
			return null;
		if (item.selector !== undefined && (typeof item.selector !== 'string' || item.selector.length > 800)) return null;
		if (item.attributes !== undefined) {
			if (!item.attributes || typeof item.attributes !== 'object' || Array.isArray(item.attributes)) return null;
			if (
				Object.entries(item.attributes).length > 10 ||
				Object.entries(item.attributes).some(
					([key, attribute]) => !/^[\w:-]+$/.test(key) || typeof attribute !== 'string' || attribute.length > 300,
				)
			)
				return null;
		}
		return {
			category: item.category,
			...safeUiDetails(item.selector, { element: item.element, attributes: item.attributes }),
		};
	}
	if (item.category === 'navigation') {
		if (
			(item.from !== undefined && typeof item.from !== 'string') ||
			(item.to !== undefined && typeof item.to !== 'string')
		)
			return null;
		return {
			category: item.category,
			...(item.from ? { from: safeUrl(item.from) ?? '[URL]' } : {}),
			...(item.to ? { to: safeUrl(item.to) ?? '[URL]' } : {}),
		};
	}
	if (item.method !== undefined && (typeof item.method !== 'string' || !/^[A-Z]{3,7}$/.test(item.method))) return null;
	if (item.url !== undefined && (typeof item.url !== 'string' || !safeUrl(item.url))) return null;
	if (
		item.statusCode !== undefined &&
		(typeof item.statusCode !== 'number' || item.statusCode < 100 || item.statusCode > 599)
	)
		return null;
	return {
		category: item.category,
		...(item.method ? { method: item.method } : {}),
		...(item.url ? { url: safeUrl(item.url) as string } : {}),
		...(item.statusCode ? { statusCode: item.statusCode } : {}),
	};
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
		.filter((item): item is SentrySlackBreadcrumb => item !== null)
		.slice(-3);
	const apiRequest = summarizeApiRequest(event);
	const replayTag = event.tags?.['PostHog Recording URL'];
	const sessionReplayUrl = typeof replayTag === 'string' ? (safePostHogReplayUrl(replayTag) ?? undefined) : undefined;
	return {
		eventId: event.event_id,
		title,
		errorType,
		route: safeRoute(event),
		tags,
		breadcrumbs,
		...(sessionReplayUrl ? { sessionReplayUrl } : {}),
		...(apiRequest ? { apiRequest } : {}),
	};
}

export function parseSentrySlackSummary(value: unknown): SentrySlackSummary | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const data = value as Partial<SentrySlackSummary>;
	if (typeof data.eventId !== 'string' || !EVENT_ID.test(data.eventId)) return null;
	if (typeof data.title !== 'string' || !data.title || data.title.length > 180) return null;
	if (typeof data.errorType !== 'string' || !data.errorType || data.errorType.length > 80) return null;
	const route =
		data.route === 'unknown' ? 'unknown' : typeof data.route === 'string' ? normalizeSentryRoute(data.route) : null;
	if (!route) return null;
	if (!data.tags || typeof data.tags !== 'object' || Array.isArray(data.tags)) return null;
	const sessionReplayUrl =
		data.sessionReplayUrl === undefined
			? undefined
			: typeof data.sessionReplayUrl === 'string'
				? safePostHogReplayUrl(data.sessionReplayUrl)
				: null;
	if (sessionReplayUrl === null) return null;
	const apiRequest = data.apiRequest === undefined ? undefined : parseApiRequest(data.apiRequest);
	if (apiRequest === null) return null;
	if (!Array.isArray(data.breadcrumbs) || data.breadcrumbs.length > 3) return null;
	const breadcrumbs = data.breadcrumbs.map(parseBreadcrumb);
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
		route,
		tags: Object.fromEntries(Object.entries(data.tags)),
		breadcrumbs: breadcrumbs.filter((item): item is SentrySlackBreadcrumb => item !== null),
		...(sessionReplayUrl ? { sessionReplayUrl } : {}),
		...(apiRequest ? { apiRequest } : {}),
	};
}
