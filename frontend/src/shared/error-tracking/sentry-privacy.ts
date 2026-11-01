import type { ErrorEvent, init } from '@sentry/nextjs';

import {
	safeDiagnosticQuery,
	safeDiagnosticUrl,
	safePostHogReplayUrl,
	safeUiDetails,
} from './sentry-diagnostic-privacy';

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;
type SpanJSON = Parameters<NonNullable<SentryOptions['beforeSendSpan']>>[0];
type TransactionEvent = Parameters<NonNullable<SentryOptions['beforeSendTransaction']>>[0];

const PRIVATE_KEY =
	/(?:^|[_.-])(authorization|proxy-authorization|cookie|cookies|set-cookie|x-api-key|x-amz-.*|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|sentry-hook-signature|body|content|filename|file_name|email|nickname|ip_address|ip|remote_addr|client_ip|geo)$/i;

function safeQueryString(value: unknown): unknown {
	const query = safeDiagnosticQuery(value);
	if (typeof value === 'string') return query.toString();
	if (Array.isArray(value)) return [...query];
	if (value && typeof value === 'object') return Object.fromEntries(query);
	return undefined;
}

function safeText(value: string): string {
	return value
		.replace(
			/https?:\/\/[^\s<>"']+|(?<![\w:/])\/[^\s<>"']*[?#][^\s<>"']*/gi,
			(url) => safeDiagnosticUrl(url) ?? '[URL]',
		)
		.replace(/\b[^\s/\\]+\.(?:png|jpe?g|gif|webp|heic|pdf|docx?|txt|csv|zip)\b/gi, '[File]')
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(
			/\b(?:Authorization|Cookie|Set-Cookie|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|code|state)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&]+)/gi,
			(match) => `${match.split(/[:=]/, 1)[0]}=[Filtered]`,
		)
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[Token]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]');
}

function redact(value: unknown, depth = 0, path: string[] = []): unknown {
	if (typeof value === 'string') return safeText(value);
	if (depth >= 8) return '[Truncated]';
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1, path));
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => {
			const stackFilename = key === 'filename' && path.includes('frames');
			if (PRIVATE_KEY.test(key) && !stackFilename) return [];
			if (/(?:^|[_.-])headers$/i.test(key)) return [[key, safeHeaders(item)]];
			if (key === 'query_string') return [[key, safeQueryString(item)]];
			if (['route', 'transaction'].includes(key) && typeof item === 'string' && item.startsWith('/'))
				return [[key, safeDiagnosticUrl(item) ?? '[URL]']];
			if (['url', 'from', 'to', 'http.url', 'url.full', 'http.target'].includes(key) && typeof item === 'string')
				return [[key, safeDiagnosticUrl(item) ?? '[URL]']];
			return [[key, redact(item, depth + 1, [...path, key])]];
		}),
	);
}

function safeHeaders(value: unknown): unknown {
	const entries: unknown[] = Array.isArray(value)
		? value
		: value && typeof value === 'object'
			? Object.entries(value)
			: [];
	const safe = entries.flatMap((entry) => {
		if (!Array.isArray(entry) || typeof entry[0] !== 'string' || typeof entry[1] !== 'string') return [];
		const [key, item] = entry as [string, string];
		const name = key.toLowerCase();
		if (name === 'x-request-id' && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(item))
			return [[key, item]];
		if (
			name === 'content-type' &&
			/^(application\/json|text\/plain|multipart\/form-data)(?:; ?charset=utf-8)?$/i.test(item)
		)
			return [[key, item]];
		return [];
	});
	return Array.isArray(value) ? safe : Object.fromEntries(safe);
}

function safeBreadcrumbs(event: ErrorEvent | TransactionEvent) {
	return event.breadcrumbs?.flatMap<NonNullable<ErrorEvent['breadcrumbs']>[number]>((crumb) => {
		const base = { category: crumb.category, type: crumb.type, level: crumb.level, timestamp: crumb.timestamp };
		if (crumb.category?.startsWith('ui.')) {
			const details = safeUiDetails(crumb.message);
			return [{ ...base, message: details.selector, data: details.attributes }];
		}
		const data: Record<string, unknown> | undefined = crumb.data;
		if (crumb.category === 'navigation')
			return [
				{
					...base,
					data: {
						from: typeof data?.from === 'string' ? data.from : undefined,
						to: typeof data?.to === 'string' ? data.to : undefined,
					},
				},
			];
		if (['fetch', 'xhr', 'http'].includes(crumb.category ?? '')) {
			const messageUrl = crumb.message?.match(/https?:\/\/[^\s<>"']+/i)?.[0];
			return [
				{
					...base,
					data: {
						method:
							typeof data?.method === 'string' && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(data.method)
								? data.method
								: undefined,
						url: typeof data?.url === 'string' ? data.url : messageUrl,
						status_code:
							typeof data?.status_code === 'number' &&
							Number.isInteger(data.status_code) &&
							data.status_code >= 100 &&
							data.status_code <= 599
								? data.status_code
								: undefined,
					},
				},
			];
		}
		return [];
	});
}

/** Keep the SDK event and its stack; remove known credentials at the final transport boundary. */
export function filterSentryEvent<T extends ErrorEvent | TransactionEvent>(event: T): T {
	const request = event.request
		? {
				...event.request,
				data: undefined,
				headers: safeHeaders(event.request.headers),
				query_string: safeQueryString(event.request.query_string),
			}
		: undefined;
	const replayValue = event.tags?.['PostHog Recording URL'] ?? event.tags?.['PostHog-Recording-URL'];
	const replay = typeof replayValue === 'string' ? safePostHogReplayUrl(replayValue) : null;
	const filtered = redact({ ...event, request, breadcrumbs: safeBreadcrumbs(event) }) as T;
	if (filtered.tags) {
		delete filtered.tags['PostHog Recording URL'];
		delete filtered.tags['PostHog-Recording-URL'];
	}
	if (filtered.contexts) delete filtered.contexts.posthog_session_replay;
	if (replay) {
		filtered.tags = { ...filtered.tags, 'PostHog Recording URL': replay };
		filtered.contexts = { ...filtered.contexts, posthog_session_replay: { url: replay } };
	}
	delete filtered.server_name;
	if (filtered.user)
		filtered.user = {
			id: typeof filtered.user.id === 'string' && /^\d{1,20}$/.test(filtered.user.id) ? filtered.user.id : undefined,
		};
	return filtered;
}

export function filterSentrySpan(span: SpanJSON): SpanJSON {
	return {
		...span,
		description: span.description ? safeText(span.description) : undefined,
		data: redact(span.data) as SpanJSON['data'],
	};
}
