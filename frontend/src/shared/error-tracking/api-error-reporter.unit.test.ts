import ky from 'ky';
import { describe, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';

import { ApiErrorReporter, RATE_LIMIT_REPORT_INTERVAL_MS } from './api-error-reporter';

const failure = async (status = 429) =>
	normalizeApiError(
		await ky
			.get('https://api.test/failure', {
				retry: 0,
				fetch: () => Promise.resolve(new Response('', { status })),
			})
			.catch((error: unknown) => error),
	);

describe('최종 API 실패 보고', () => {
	it('같은 429 작업은 60초에 한 건만 보내고 다른 작업과 다음 시간창은 별도 보고한다', async () => {
		const captureException = vi.fn();
		let now = 0;
		const tracker = new ApiErrorReporter({ captureException, captureMessage: vi.fn() }, () => now);
		const report = tracker.report.bind(tracker);
		report(await failure(), { operation: 'query' });
		report(await failure(), { operation: 'query' });
		expect(captureException).toHaveBeenCalledTimes(1);
		expect(captureException.mock.calls[0]?.[1]).toMatchObject({ level: 'warning' });
		report(await failure(), { operation: 'draft.save' });
		expect(captureException.mock.calls[1]?.[1]).toMatchObject({ level: 'error' });
		now = RATE_LIMIT_REPORT_INTERVAL_MS;
		report(await failure(), { operation: 'query' });
		expect(captureException).toHaveBeenCalledTimes(3);
	});
	it('업로드·상위 mutation에서 동일 오류를 전달해도 최초 작업으로 한 번만 보고한다', async () => {
		const captureException = vi.fn();
		const tracker = new ApiErrorReporter({ captureException, captureMessage: vi.fn() });
		const report = tracker.report.bind(tracker);
		const error = await failure(503);
		report(error, { operation: 'upload.put' });
		report(error, { operation: 'colog.create' });
		report(error.cause, { operation: 'mutation' });
		expect(captureException).toHaveBeenCalledTimes(1);
		expect(captureException.mock.calls[0]?.[1]).toMatchObject({ tags: { operation: 'upload.put' } });
	});
	it('명시 보고 이후 자동 수집은 중복 제거하고 전송용 Error는 보존한다', async () => {
		const error = await failure(500);
		const tracker = new ApiErrorReporter({ captureException: vi.fn(), captureMessage: vi.fn() });
		const report = tracker.report.bind(tracker);
		report(error, { operation: 'draft.save' });
		expect(tracker.getCaptureDecision(error)).toEqual({ capture: false });
		expect(tracker.getCaptureDecision(error, true)).toEqual({ capture: true, level: 'error' });
		expect(tracker.getCaptureDecision(new Error('unrelated'))).toEqual({ capture: true });
	});
	it('전송기가 실패해도 호출자에게 예외를 전파하지 않는다', () => {
		const tracker = new ApiErrorReporter({
			captureException: () => {
				throw new Error('SDK');
			},
			captureMessage: vi.fn(),
		});
		expect(() => tracker.report(new Error('failure'), { operation: 'post.publish' })).not.toThrow();
	});

	it('서로 다른 reporter 인스턴스는 handled 상태를 공유하지 않는다', () => {
		const error = new Error('failure');
		for (let i = 0; i < 2; i++) {
			const capture = vi.fn();
			const reporter = new ApiErrorReporter({ captureException: capture, captureMessage: vi.fn() });
			reporter.report(error, { operation: 'post.publish' });
			expect(capture).toHaveBeenCalledOnce();
		}
	});
});

it('자동 수집 경계에서도 정상 404는 제외하고 최종 429는 warning 한 건만 전송한다', async () => {
	const reporter = new ApiErrorReporter({ captureException: vi.fn(), captureMessage: vi.fn() });
	expect(reporter.getCaptureDecision(await failure(404))).toEqual({ capture: false });
	expect(reporter.getCaptureDecision(await failure())).toEqual({ capture: true, level: 'warning' });
	expect(reporter.getCaptureDecision(await failure())).toEqual({ capture: false });
});
