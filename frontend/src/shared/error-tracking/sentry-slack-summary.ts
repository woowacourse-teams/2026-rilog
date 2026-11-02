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
	for (const candidate of [event.transaction, event.request?.url, event.contexts?.nextjs?.request_path]) {
		if (typeof candidate !== 'string') continue;
		try {
			const route = normalizeSentryRoute(
				new URL(candidate.replace(/^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\s+/, ''), ROUTE_BASE_URL).pathname,
			);
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

/** Build the allowed Slack summary from a validated Sentry webhook event. */
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
