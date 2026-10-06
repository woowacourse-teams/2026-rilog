import { expect, it } from 'vitest';

import type { HTTPError } from 'ky';

import type { NormalizedApiError } from '@/shared/api/api-error';

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
