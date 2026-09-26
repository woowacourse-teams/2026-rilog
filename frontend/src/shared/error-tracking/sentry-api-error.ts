import type { ErrorEvent } from '@sentry/nextjs';

import type { NormalizedApiError } from '@/shared/api/api-error';

export interface ApiErrorReport {
	error: Error;
	tags: Record<string, string>;
}

// 전송용 Error에는 원본 cause를 연결하지 않는다. SDK의 cause 탐색으로 요청 본문이 유출될 수 있다.

function stripUrlParameters(value: string): string {
	return value.replace(/[?#][^\s)]*/g, (parameters) => parameters.match(/:\d+(?::\d+)?$/)?.[0] ?? '');
}

export function createApiErrorReport(normalized: NormalizedApiError, operation?: string): ApiErrorReport {
	const tags: Record<string, string> = { error_type: normalized.type };
	if (operation && /^[a-z][a-z0-9_.-]{0,63}$/.test(operation)) tags.operation = operation;
	if ('response' in normalized) {
		tags.status = String(normalized.response.status);
		const requestId = normalized.response.headers.get('X-Request-ID');
		if (requestId && /^[a-f0-9-]{36}$/i.test(requestId)) tags.request_id = requestId;
	}
	if (normalized.type === 'api') {
		tags.error_kind = normalized.kind ?? 'unknown';
		// 미정의 코드도 진단하되 응답의 임의 문자열을 그대로 보내지 않는다.
		tags.error_code = /^[A-Z][A-Z0-9_]{0,99}$/.test(normalized.detail.errorCode)
			? normalized.detail.errorCode
			: 'UNKNOWN_ERROR_CODE';
	}

	const error = new Error(`API request failed: ${tags.error_code ?? normalized.type}`);
	error.name = 'NormalizedApiError';
	const frames =
		normalized.cause instanceof Error
			? normalized.cause.stack?.split('\n').filter((line) => /^\s*at\s|^[^@\s]*@/.test(line))
			: undefined;
	// 원본이 없으면 보고 위치를 발생 위치인 것처럼 제시하지 않는다.
	error.stack = [`${error.name}: ${error.message}`, ...(frames ?? []).map(stripUrlParameters)].join('\n');
	const report = { error, tags };
	return report;
}

/** SDK가 추가한 request/breadcrumb/extra도 최종 전송 경계에서 제거한다. 일반 오류에는 적용하지 않는다. */
export function sanitizeApiErrorEvent(event: ErrorEvent, report: ApiErrorReport): ErrorEvent {
	const exception = event.exception?.values?.at(-1);
	const frames = exception?.stacktrace?.frames?.map((frame) => ({
		filename: frame.filename ? stripUrlParameters(frame.filename) : undefined,
		function: frame.function,
		lineno: frame.lineno,
		colno: frame.colno,
		in_app: frame.in_app,
	}));
	return {
		...event,
		message: undefined,
		logentry: undefined,
		user: undefined,
		request: undefined,
		breadcrumbs: event.breadcrumbs
			?.filter((item) => item.category === 'rilog.rate_limit' && item.message === 'HTTP 429')
			.map((item) => ({
				category: 'rilog.rate_limit',
				message: 'HTTP 429',
				level: 'warning' as const,
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
		extra: undefined,
		contexts: undefined,
		tags: report.tags,
		exception: {
			values: [
				{
					type: report.error.name,
					value: report.error.message,
					stacktrace: frames ? { frames } : undefined,
					mechanism: exception?.mechanism
						? {
								type: exception.mechanism.type,
								handled: exception.mechanism.handled,
							}
						: undefined,
				},
			],
		},
	};
}
