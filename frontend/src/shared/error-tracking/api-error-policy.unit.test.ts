import { expect, it } from 'vitest';

import type { HTTPError } from 'ky';

import type { NormalizedApiError } from '@/shared/api/api-error';
import { API_ERROR_CODES } from '@/shared/api/error-codes';

import { classifyApiError, shouldReportApiError } from './api-error-policy';

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

it.each([
	[400, 'REQUEST_VALIDATION_FAILED', 'validation', false],
	[400, 'UNRECOGNIZED_UPLOAD_ERROR', 'unexpected_response', true],
	[500, 'POST_VIEW_COUNT_MISSING', 'server_response', true],
	[429, 'TOO_MANY_REQUESTS', 'rate_limit', true],
] as const)('HTTP %s / %s를 %s로 분류하고 보고 여부를 보존한다', async (status, code, kind, report) => {
	const { createApiFailure } = await import('@/test/fixtures/api-error');
	expect(classifyApiError(await createApiFailure(code, status), { operation: 'upload.presign' })).toEqual({
		kind,
		report,
	});
});

it('일반 HTTP 400은 정상 검증 거부로 단정하지 않는다', () => {
	expect(classifyApiError(createHttpFailure(400), { operation: 'upload.put' })).toEqual({
		kind: 'unexpected_response',
		report: true,
	});
});
