import type { ErrorEvent } from '@sentry/nextjs';

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

export interface SentrySlackSummary {
	eventId: string;
	title: string;
	errorType: string;
	route: string;
	tags: Record<string, string>;
	breadcrumbs: SentrySlackBreadcrumb[];
	sessionReplayUrl?: string;
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
const ROUTE_BASE_URL = 'https://www.rilog.kr';
const BREADCRUMB_CATEGORIES = /^(fetch|xhr|http|navigation|ui\.(click|input|submit))$/;
const PRIVATE_KEY =
	/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-amz-.*|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|body|content|value)$/i;
const PRIVATE_QUERY_KEY =
	/^(code|state|password|client_secret|api_key|token|access_token|refresh_token|id_token|signature|nickname|email|filename|title|content|x-amz-.*)$/i;

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

function safeUrl(value: string): string | null {
	try {
		const url = new URL(value, 'https://www.rilog.kr');
		url.username = '';
		url.password = '';
		url.hash = '';
		for (const key of [...url.searchParams.keys()]) {
			if (PRIVATE_QUERY_KEY.test(key)) url.searchParams.delete(key);
		}
		return value.startsWith('/') ? `${url.pathname}${url.search}` : url.toString();
	} catch {
		return null;
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

function safePostHogReplayUrl(value: string): string | null {
	try {
		const url = new URL(value);
		const configuredHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
			? new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST).hostname
			: undefined;
		const configuredUiHost = configuredHost?.replace(/\.i\.posthog\.com$/, '.posthog.com');
		const isAllowedHost =
			url.hostname === 'posthog.com' ||
			url.hostname.endsWith('.posthog.com') ||
			url.hostname === configuredHost ||
			url.hostname === configuredUiHost;
		const parts = url.pathname.split('/').filter(Boolean);
		if (
			url.protocol !== 'https:' ||
			!isAllowedHost ||
			parts.length !== 4 ||
			parts[0] !== 'project' ||
			!parts[1] ||
			parts[2] !== 'replay' ||
			!parts[3]
		)
			return null;
		if ([...url.searchParams.keys()].some((key) => key !== 't')) return null;
		if (url.searchParams.has('t') && !/^\d+$/.test(url.searchParams.get('t') ?? '')) return null;
		url.hash = '';
		return url.toString();
	} catch {
		return null;
	}
}

function cleanText(value: string, limit: number): string {
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, (url) => safeApiUrl(url) ?? '[URL]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\bvalue=(?:"[^"]*"|'[^']*'|[^\]\s]+)/gi, 'value=[Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/[<>@]/g, '')
		.replace(/[\r\n\t]/g, ' ')
		.slice(0, limit)
		.trim();
}

function cleanDiagnosticText(value: string, limit = 800): string {
	return value
		.replace(/(?:https?:\/\/|\/)[^\s<>"']+/gi, (url) => safeUrl(url) ?? '[URL]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(/\bvalue=(?:"[^"]*"|'[^']*'|[^\]\s]+)/gi, 'value=[Filtered]')
		.replace(/\b(?:token|password|secret|authorization|cookie|code|state)\s*[:=]\s*[^\s,;]+/gi, '[Filtered]')
		.replace(/```/g, "''' ")
		.replace(/[\r\n\t]/g, ' ')
		.slice(0, limit)
		.trim();
}

function uiDetails(message: string): Pick<SentrySlackBreadcrumb, 'attributes' | 'element' | 'selector'> {
	const selector = cleanDiagnosticText(message);
	const target = selector.split(/\s*>\s*/).at(-1) ?? selector;
	const element = target.match(/^([a-z][\w-]*)/i)?.[1]?.toLowerCase();
	const attributes: Record<string, string> = {};
	const id = target.match(/#([\w-]+)/)?.[1];
	const classes = [...target.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
	if (id) attributes.id = id;
	if (classes.length) attributes.class = classes.join(' ');
	for (const match of target.matchAll(/\[([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g)) {
		const name = match[1].toLowerCase();
		if (PRIVATE_KEY.test(name) || Object.keys(attributes).length >= 10) continue;
		attributes[name] = cleanDiagnosticText(match[2] ?? match[3] ?? match[4] ?? 'true', 300);
	}
	return {
		...(element ? { element } : {}),
		selector,
		...(Object.keys(attributes).length ? { attributes } : {}),
	};
}

function summarizeBreadcrumb(breadcrumb: NonNullable<ErrorEvent['breadcrumbs']>[number]): SentrySlackBreadcrumb | null {
	const category = breadcrumb.category;
	if (!category || !BREADCRUMB_CATEGORIES.test(category)) return null;
	const data = breadcrumb.data;
	if (category.startsWith('ui.')) {
		return { category, ...(breadcrumb.message ? uiDetails(breadcrumb.message) : {}) };
	}
	if (category === 'navigation') {
		const from = typeof data?.from === 'string' ? cleanDiagnosticText(data.from) : undefined;
		const to = typeof data?.to === 'string' ? cleanDiagnosticText(data.to) : undefined;
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
					([key, attribute]) =>
						PRIVATE_KEY.test(key) || !/^[\w:-]+$/.test(key) || typeof attribute !== 'string' || attribute.length > 300,
				)
			)
				return null;
		}
		return {
			category: item.category,
			...(item.element ? { element: item.element } : {}),
			...(item.selector ? { selector: cleanDiagnosticText(item.selector) } : {}),
			...(item.attributes
				? {
						attributes: Object.fromEntries(
							Object.entries(item.attributes).map(([key, attribute]) => [key, cleanDiagnosticText(attribute, 300)]),
						),
					}
				: {}),
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
			...(item.from ? { from: cleanDiagnosticText(item.from) } : {}),
			...(item.to ? { to: cleanDiagnosticText(item.to) } : {}),
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
	};
}
