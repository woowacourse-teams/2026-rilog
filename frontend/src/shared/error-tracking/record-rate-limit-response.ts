import { addBreadcrumb } from '@sentry/nextjs';

/** 재시도 중 429는 예외 이벤트를 만들지 않고 정적인 정보만 남긴다. */
export function recordRateLimitResponse(method: string, retryCount: number): void {
	try {
		addBreadcrumb({
			category: 'rilog.rate_limit',
			message: 'HTTP 429',
			level: 'warning',
			data: {
				method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) ? method : 'OTHER',
				retry_count: retryCount,
			},
		});
	} catch {
		// 관측 실패가 HTTP 요청의 재시도를 방해하지 않는다.
	}
}
