import { TimeoutError } from 'ky';
import { afterEach, expect, it, vi } from 'vitest';

import type { ErrorTracker } from './error-tracker';

import { rememberApiRequest } from '@/shared/api/request-diagnostics';
import { createApiFailure } from '@/test/fixtures/api-error';

import { createApiErrorReporter, shouldCaptureAutomaticError } from './api-error-reporter';

const captureException = vi.fn<ErrorTracker['captureException']>();
const reporter = createApiErrorReporter({ captureException, captureMessage: vi.fn(), setUser: vi.fn() });
afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

it.each([
	['feed.read', 'load_failed'],
	['draft.save', 'save_failed'],
] as const)('%s timeout은 원본 오류와 작업 맥락을 보존하고 중복 보고하지 않는다', (operation, userImpact) => {
	const original = new TimeoutError(new Request('https://api.rilog.test/v1/posts'));
	rememberApiRequest(original, 'POST', 'https://api.rilog.test/v1/posts');
	reporter.report(original, { operation, userImpact });
	reporter.report({ type: 'timeout', cause: original }, { operation });
	expect(captureException).toHaveBeenCalledExactlyOnceWith(original, {
		tags: { report_source: 'api', operation, error_kind: 'timeout', user_impact: userImpact },
		contexts: { api_request: { method: 'POST', url: 'https://api.rilog.test/v1/posts' } },
	});
	expect(shouldCaptureAutomaticError(original)).toBe(false);
});

it('취소와 오프라인 network는 제외하고 온라인 network는 서버 장애로 단정하지 않고 수집한다', () => {
	reporter.report(new DOMException('cancelled', 'AbortError'), { operation: 'feed.read' });
	vi.stubGlobal('navigator', { onLine: false });
	reporter.report(new TypeError('Failed to fetch'), { operation: 'feed.read' });
	expect(captureException).not.toHaveBeenCalled();
	vi.stubGlobal('navigator', { onLine: true });
	reporter.report(new TypeError('Failed to fetch'), { operation: 'feed.read', userImpact: 'load_failed' });
	expect(captureException.mock.calls[0]?.[1]?.tags).toMatchObject({
		error_kind: 'network',
		user_impact: 'load_failed',
	});
});

it('정상 validation은 제외하지만 원인 불명 upload 400과 M_ID는 근거 없이 차단하지 않는다', async () => {
	reporter.report(await createApiFailure('REQUEST_VALIDATION_FAILED'), { operation: 'upload.presign' });
	expect(captureException).not.toHaveBeenCalled();
	reporter.report(await createApiFailure('M_ID'), { operation: 'upload.presign' });
	expect(captureException.mock.calls[0]?.[1]?.tags).toMatchObject({
		http_status: '400',
		error_kind: 'unexpected_response',
		error_code: 'M_ID',
	});
});
