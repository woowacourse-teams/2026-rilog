import type { ErrorEvent, init } from '@sentry/nextjs';

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;
type SpanJSON = Parameters<NonNullable<SentryOptions['beforeSendSpan']>>[0];
type TransactionEvent = Parameters<NonNullable<SentryOptions['beforeSendTransaction']>>[0];

const PRIVATE_KEY =
	/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|x-amz-.*|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|body|content)$/i;
const PRIVATE_QUERY_KEY =
	/^(code|state|password|client_secret|api_key|token|access_token|refresh_token|id_token|signature|nickname|email|filename|title|content|x-amz-.*)$/i;

function safeUrl(value: string): string {
	try {
		const url = new URL(value);
		url.username = '';
		url.password = '';
		for (const key of url.searchParams.keys()) {
			if (PRIVATE_QUERY_KEY.test(key)) url.searchParams.set(key, '[Filtered]');
		}
		return url.toString();
	} catch {
		return value;
	}
}

function safeQueryString(value: unknown): unknown {
	if (typeof value === 'string') {
		try {
			const query = new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
			for (const key of query.keys()) {
				if (PRIVATE_QUERY_KEY.test(key)) query.set(key, '[Filtered]');
			}
			return query.toString();
		} catch {
			return '[Filtered]';
		}
	}

	if (Array.isArray(value)) {
		const entries: unknown[] = value;
		return entries.map((entry): unknown => {
			const tuple: unknown[] | undefined = Array.isArray(entry) ? entry : undefined;
			if (tuple && typeof tuple[0] === 'string' && PRIVATE_QUERY_KEY.test(tuple[0])) {
				return [tuple[0], '[Filtered]', ...tuple.slice(2)];
			}
			return entry;
		});
	}

	if (value !== null && typeof value === 'object') {
		const query = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(query).map(([key, item]) => [key, PRIVATE_QUERY_KEY.test(key) ? '[Filtered]' : item]),
		);
	}

	return value;
}

function safeText(value: string): string {
	return value
		.replace(/https?:\/\/[^\s<>"']+/gi, (url) => safeUrl(url))
		.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [Filtered]')
		.replace(
			/\b(?:Authorization|Cookie|Set-Cookie|password|secret|client_secret|api_key|private_key|access_token|refresh_token|id_token|token|signature|code|state)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&]+)/gi,
			(match) => `${match.split(/[:=]/, 1)[0]}=[Filtered]`,
		)
		.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[Token]')
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[Email]');
}

function redact(value: unknown, depth = 0): unknown {
	if (typeof value === 'string') return safeText(value);
	if (depth >= 8) return '[Truncated]';
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
	return Object.fromEntries(
		Object.entries(value).flatMap(([key, item]) => (PRIVATE_KEY.test(key) ? [] : [[key, redact(item, depth + 1)]])),
	);
}

/** Keep the SDK event and its stack; remove known credentials at the final transport boundary. */
export function filterSentryEvent<T extends ErrorEvent | TransactionEvent>(event: T): T {
	const request = event.request
		? {
				...event.request,
				data: undefined,
				headers: redact(event.request.headers),
				query_string: safeQueryString(event.request.query_string),
			}
		: undefined;
	const filtered = redact({ ...event, request }) as T;
	if (filtered.user) filtered.user = { id: filtered.user.id };
	return filtered;
}

export function filterSentrySpan(span: SpanJSON): SpanJSON {
	return {
		...span,
		description: span.description ? safeText(span.description) : undefined,
		data: redact(span.data) as SpanJSON['data'],
	};
}
