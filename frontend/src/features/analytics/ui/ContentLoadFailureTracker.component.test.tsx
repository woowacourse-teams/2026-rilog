import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { contentLoadFailedMock, captureExceptionMock } = vi.hoisted(() => ({
	contentLoadFailedMock: vi.fn(),
	captureExceptionMock: vi.fn(),
}));
vi.mock('@/shared/error-tracking/error-tracker-instance', async () => {
	const { createSentryErrorTracker } = await import('@/shared/error-tracking/sentry-error-tracker');
	const tracker = createSentryErrorTracker();
	tracker.captureException = captureExceptionMock;
	return { errorTracker: tracker, sentryErrorTracker: tracker };
});

vi.mock('@/features/analytics/model/events', () => ({
	analytics: { contentLoadFailed: contentLoadFailedMock },
}));

import { createApiFailure } from '@/test/fixtures/api-error';

import ContentLoadFailureTracker from './ContentLoadFailureTracker';

describe('ContentLoadFailureTracker', () => {
	beforeEach(() => {
		contentLoadFailedMock.mockReset();
		captureExceptionMock.mockReset();
	});

	it('같은 mount에서는 오류 정보가 바뀌어도 한 번만 기록한다', () => {
		const { rerender } = render(
			<ContentLoadFailureTracker surface="feed" loadPhase="initial" error={new TypeError('network')} />,
		);
		expect(contentLoadFailedMock).toHaveBeenCalledOnce();
		expect(contentLoadFailedMock).toHaveBeenCalledWith(
			expect.objectContaining({ surface: 'feed', loadPhase: 'initial' }),
		);

		rerender(<ContentLoadFailureTracker surface="feed" loadPhase="pagination" error={new Error('retry')} />);
		expect(contentLoadFailedMock).toHaveBeenCalledOnce();
	});
	it.each([
		{ code: 'POST_NOT_FOUND', collect: false },
		{ code: 'INVALID_REQUEST_BODY', collect: true },
	])('복구 UI에서도 $code의 의미로 수집을 결정한다', async ({ code, collect }) => {
		const error = await createApiFailure(code);
		render(<ContentLoadFailureTracker surface="post_detail" loadPhase="detail" error={error} />);
		expect(captureExceptionMock).toHaveBeenCalledTimes(collect ? 1 : 0);
	});
});
