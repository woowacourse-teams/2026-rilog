import { expect, it } from 'vitest';

import type { HTTPError } from 'ky';

import type { NormalizedApiError } from '@/shared/api/api-error';
import { API_ERROR_CODES } from '@/shared/api/error-codes';

import { shouldReportApiError } from './api-error-policy';

const createHttpFailure = (status: number): NormalizedApiError => ({
	type: 'http',
	response: new Response(null, { status }),
	cause: new Error(`HTTP ${status}`) as unknown as HTTPError,
});

it.each([403, 404])('presigned S3 PUT의 HTTP %i는 수집하고 일반 API의 동일 응답은 제외한다', (status) => {
	const error = createHttpFailure(status);

	expect(shouldReportApiError(error, { operation: 'upload.put' })).toBe(true);
	expect(shouldReportApiError(error, { operation: 'post.read' })).toBe(false);
});

it.each([
	[503, API_ERROR_CODES.POST_VIEW_REGISTRATION_DISABLED, false],
	[500, API_ERROR_CODES.POST_VIEW_REGISTRATION_DISABLED, true],
	[503, API_ERROR_CODES.INTERNAL_SERVER_ERROR, true],
] as const)('조회 등록의 HTTP %s / %s는 보고 여부 %s를 적용한다', (status, errorCode, expected) => {
	const failure: NormalizedApiError = {
		type: 'api',
		kind: 'server',
		response: new Response(null, { status }),
		cause: new Error('HTTP failure') as unknown as HTTPError,
		detail: { status, error: 'Service Unavailable', errorCode, message: '등록 실패', invalidParams: null },
	};
	expect(shouldReportApiError(failure, { operation: 'post.view.register' })).toBe(expected);
});
