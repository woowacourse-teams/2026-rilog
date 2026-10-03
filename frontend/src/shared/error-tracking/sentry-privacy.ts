import type { ErrorEvent, Event, init } from '@sentry/nextjs';

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;
type SpanJSON = Parameters<NonNullable<SentryOptions['beforeSendSpan']>>[0];
type TransactionEvent = Parameters<NonNullable<SentryOptions['beforeSendTransaction']>>[0];

import { API_ERROR_OPERATION_CONTRACTS, resolveApiOperation } from '@/shared/api/api-error-contracts';
import { API_ERROR_CODES, API_ERROR_CODE_KINDS } from '@/shared/api/error-codes';

const STATIC_ROUTES = new Set([
	'/',
	'/feeds',
	'/write',
	'/about',
	'/sign-up',
	'/colog/create',
	'/auth/github/callback',
	'/api/auth/proxy-session',
	'/feed.json',
	'/sitemap.xml',
	'/rss.xml',
	'/robots.txt',
	'/llms.txt',
	'/.well-known/llms.txt',
]);

/** 알 수 없는 경로는 원문을 남기지 않는다. query에는 draft ID와 OAuth 정보가 들어갈 수 있다. */
export function toSentryRoute(value?: string): string {
	if (!value) return 'unknown';

	try {
		const path =
			new URL(
				value.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /, ''),
				'https://route.invalid',
			).pathname.replace(/\/$/, '') || '/';

		if (STATIC_ROUTES.has(path)) return path;
		if (/^\/[^/]+\/posts\/[^/]+\/markdown$/.test(path)) return '/[slug]/posts/[postId]/markdown';
		if (/^\/[^/]+\/posts\/[^/]+$/.test(path)) return '/[slug]/posts/[postId]';
		if (/^\/[^/]+\/settings$/.test(path)) return '/[slug]/settings';
		if (/^\/[^/]+$/.test(path)) return '/[slug]';
	} catch {
		/* 잘못된 URL도 원문을 보내지 않는다. */
	}

	return 'unknown';
}

export interface SentryPrivacyContext {
	environment: string;
	release: string;
	pathname?: string;
	userAgent?: string;
}

function clientTags(userAgent: string) {
	const browsers: [string, RegExp][] = [
		['Edge', /(?:Edg|EdgiOS|EdgA)\/(\d{1,3})/],
		['Firefox', /(?:Firefox|FxiOS)\/(\d{1,3})/],
		['Chrome', /(?:Chrome|CriOS)\/(\d{1,3})/],
		['Safari', /Version\/(\d{1,3}).*Safari\//],
	];

	const match = browsers
		.map(([name, pattern]) => ({ name, major: userAgent.match(pattern)?.[1] }))
		.find((item) => item.major);

	return {
		browser: match ? `${match.name}/${match.major}` : 'unknown',
		device:
			/iPad|Tablet/i.test(userAgent) || (/Android/.test(userAgent) && !/Mobile/.test(userAgent))
				? 'tablet'
				: /Mobi|iPhone/i.test(userAgent)
					? 'mobile'
					: userAgent
						? 'desktop'
						: 'unknown',
	};
}

function routeFeature(route: string): string {
	if (route === '/write') return 'writing';
	if (route.startsWith('/auth/') || route === '/sign-up' || route === '/api/auth/proxy-session') return 'auth';
	if (route === '/colog/create' || route === '/[slug]/settings') return 'colog';
	if (route === '/feeds' || route.startsWith('/[slug]')) return 'content';

	return 'app';
}

function eventUserAgent(event: Event, context: SentryPrivacyContext): string {
	const value =
		context.userAgent ??
		Object.entries(event.request?.headers ?? {}).find(([name]) => name.toLowerCase() === 'user-agent')?.[1] ??
		'';
	return value
		.replace(/\p{Cc}/gu, '')
		.trim()
		.slice(0, 1024);
}

/** UA는 위조할 수 있으므로 사용자 인증이나 수집 제외에 사용하지 않는다. */
function clientDetectionTags(userAgent: string): Record<string, string> {
	const botName = [
		['Googlebot', /\bGooglebot\b/i],
		['bingbot', /\bbingbot\b/i],
		['DuckDuckBot', /\bDuckDuckBot\b/i],
	] as const;
	const matchedBot = botName.find(([, pattern]) => pattern.test(userAgent))?.[0];
	const clientType =
		matchedBot || /bot\b|crawler|spider/i.test(userAgent)
			? 'bot'
			: /\bHeadlessChrome\//i.test(userAgent)
				? 'automation'
				: clientTags(userAgent).browser !== 'unknown'
					? 'browser'
					: 'unknown';
	return {
		client_type: clientType,
		detection_source: userAgent ? 'user_agent' : 'unknown',
		...(matchedBot ? { bot_name: matchedBot } : {}),
	};
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function apiTags(event: Event): Record<string, string> {
	const tags: Record<string, string> = {};
	const code = event.tags?.api_error_code ?? event.tags?.errorCode;

	if (typeof code === 'string' && code !== 'NO_ERROR_CODE') {
		tags.api_error_code = Object.hasOwn(API_ERROR_CODES, code) ? code : 'UNKNOWN_ERROR_CODE';
	}

	for (const [key, allowed] of Object.entries({
		error_type: ['api', 'http', 'network', 'timeout', 'unknown'],
		error_kind: [...Object.values(API_ERROR_CODE_KINDS), 'unknown'],
	})) {
		const value = event.tags?.[key];
		if (typeof value === 'string' && allowed.includes(value)) tags[key] = value;
	}

	const status = String(event.tags?.httpStatus ?? '');
	if (/^[1-5]\d\d$/.test(status)) {
		tags.httpStatus = status;
	}

	const requestId = event.tags?.request_id;
	if (typeof requestId === 'string' && UUID.test(requestId)) {
		tags.request_id = requestId;
	}

	return tags;
}

/** 빌드 결과물의 위치만 남기고 임의 URL·업로드 파일명·로컬 절대 경로를 제거한다. */
function codeLocation(value?: string): string | undefined {
	if (!value) return undefined;

	const path = value.split(/[?#]/, 1)[0];
	const built = path.match(/(?:^|\/)(_next\/static\/[a-zA-Z0-9_./()[\]@~-]+\.(?:js|mjs))$/);

	if (built && !built[1].includes('..')) {
		return `app:///${built[1]}`;
	}

	// 서버 스택도 배포한 Next chunk의 상대 위치만 보존한다.
	const server = path.match(/(?:^|\/)(?:\.next|_next)\/(server\/[a-zA-Z0-9_./()[\]@~-]+\.js)$/);
	if (server && !server[1].includes('/../')) {
		return `app:///_next/${server[1]}`;
	}

	return undefined;
}

function commonEvent(event: Event, context: SentryPrivacyContext): Event {
	const route = toSentryRoute(context.pathname ?? event.request?.url ?? event.transaction);
	const operation = resolveApiOperation(typeof event.tags?.operation === 'string' ? event.tags.operation : undefined);
	const tags = {
		environment: context.environment,
		release: context.release,
		feature:
			operation === 'unhandled' && event.exception?.values?.at(-1)?.type !== 'NormalizedApiError'
				? routeFeature(route)
				: API_ERROR_OPERATION_CONTRACTS[operation].feature,
		operation,
		route,
		...clientTags(eventUserAgent(event, context)),
		...apiTags(event),
	};

	return {
		event_id: event.event_id,
		timestamp: event.timestamp,
		platform: 'javascript',
		environment: context.environment,
		release: context.release,
		level: event.level,
		transaction: route,
		tags,
		debug_meta: event.debug_meta
			? {
					images: event.debug_meta.images?.flatMap((item) => {
						const codeFile = codeLocation(item.code_file);
						return codeFile && item.debug_id && UUID.test(item.debug_id)
							? [{ type: 'sourcemap', code_file: codeFile, debug_id: item.debug_id }]
							: [];
					}),
				}
			: undefined,
	};
}

/** 허용한 필드만 골라 새 이벤트를 만든다. 원본 객체를 펼치지 않는다. */
export function sanitizeSentryError(event: ErrorEvent, context: SentryPrivacyContext): ErrorEvent {
	const safe = commonEvent(event, context);
	const userAgent = eventUserAgent(event, context);
	const exception = event.exception?.values?.at(-1);
	const isApi = exception?.type === 'NormalizedApiError';
	const originalType = exception?.type ?? 'Error';
	const type = isApi
		? 'NormalizedApiError'
		: ['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError', 'EvalError'].includes(
					originalType,
			  )
			? originalType
			: 'Error';
	const value = isApi
		? `[${String(safe.tags?.feature)}] ${String(safe.tags?.operation)} failed: ${String(safe.tags?.api_error_code ?? 'NO_ERROR_CODE')} (${String(safe.tags?.httpStatus ?? 'NO_RESPONSE')})`
		: exception
			? `${type}: application error`
			: 'Application message';

	return {
		...safe,
		tags: { ...safe.tags, ...clientDetectionTags(userAgent) },
		contexts: userAgent ? { client: { user_agent: userAgent } } : undefined,
		type: undefined,
		...(exception
			? {
					exception: {
						values: [
							{
								type,
								value,
								stacktrace: {
									frames:
										exception.stacktrace?.frames?.flatMap((frame) => {
											const filename = codeLocation(frame.filename);
											return filename
												? [{ filename, lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app }]
												: [];
										}) ?? [],
								},
								mechanism: { type: 'generic', handled: exception.mechanism?.handled ?? false },
							},
						],
					},
				}
			: { message: value }),
		breadcrumbs: event.breadcrumbs
			?.filter((item) => item.category === 'rilog.rate_limit' && item.message === 'HTTP 429')
			.map((item) => ({
				category: 'rilog.rate_limit',
				message: 'HTTP 429',
				level: 'warning',
				timestamp: item.timestamp,
				data: {
					method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(String(item.data?.method))
						? String(item.data?.method)
						: 'OTHER',
					retry_count:
						typeof item.data?.retry_count === 'number' && Number.isFinite(item.data.retry_count)
							? item.data.retry_count
							: 0,
				},
			})),
	};
}

export function sanitizeSentrySpan(span: SpanJSON): SpanJSON {
	try {
		return {
			span_id: span.span_id,
			trace_id: span.trace_id,
			parent_span_id: span.parent_span_id,
			start_timestamp: span.start_timestamp,
			timestamp: span.timestamp,
			description: toSentryRoute(span.description),
			op: ['http.client', 'http.server', 'pageload', 'navigation', 'resource.script', 'function'].includes(
				span.op ?? '',
			)
				? span.op
				: 'other',
			data: {},
		};
	} catch {
		// beforeSendSpan은 null을 반환할 수 없으므로 원문 대신 비어 있는 span을 반환한다.
		return {
			span_id: '0000000000000000',
			trace_id: '00000000000000000000000000000000',
			start_timestamp: 0,
			data: {},
			description: 'unavailable',
		};
	}
}

export function sanitizeSentryTransaction(event: TransactionEvent, context: SentryPrivacyContext): TransactionEvent {
	const trace = event.contexts?.trace;

	return {
		...commonEvent(event, context),
		type: 'transaction',
		start_timestamp: event.start_timestamp,
		transaction_info: { source: 'route' },
		contexts:
			trace &&
			typeof trace.trace_id === 'string' &&
			/^[a-f0-9]{32}$/i.test(trace.trace_id) &&
			typeof trace.span_id === 'string' &&
			/^[a-f0-9]{16}$/i.test(trace.span_id)
				? {
						trace: {
							trace_id: trace.trace_id,
							span_id: trace.span_id,
							op: ['http.server', 'pageload', 'navigation'].includes(trace.op ?? '') ? trace.op : 'other',
						},
					}
				: undefined,
		spans: event.spans?.map(sanitizeSentrySpan),
	};
}
