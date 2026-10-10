import { beforeEach, expect, it, vi } from 'vitest';

import { SentryErrorTracker } from './sentry-error-tracker';

const { captureException, captureMessage, setUser, setTag, setContext, setExtras, setLevel, warning } = vi.hoisted(
	() => ({
		captureException: vi.fn(),
		captureMessage: vi.fn(),
		setUser: vi.fn(),
		setTag: vi.fn(),
		setContext: vi.fn(),
		setExtras: vi.fn(),
		setLevel: vi.fn(),
		warning: vi.fn(),
	}),
);

vi.mock('@sentry/nextjs', () => ({
	captureException,
	captureMessage,
	setUser,
	withScope: (callback: (scope: unknown) => void) => callback({ setTag, setContext, setExtras, setLevel }),
}));
vi.mock('@/shared/utils/non-production-console', () => ({ logNonProductionWarning: warning }));

beforeEach(() => {
	vi.resetAllMocks();
});

it('원본 오류와 보고 문맥을 SDK에 전달하고 사용자 ID를 해제할 수 있다', () => {
	const tracker = new SentryErrorTracker();
	const error = new Error('request failed');
	tracker.captureException(error, {
		tags: { operation: 'post.publish' },
		contexts: { api_request: { method: 'POST' } },
	});
	tracker.setUser('42');
	tracker.setUser(null);

	expect(captureException).toHaveBeenCalledWith(error);
	expect(setTag).toHaveBeenCalledWith('operation', 'post.publish');
	expect(setContext).toHaveBeenCalledWith('api_request', { method: 'POST' });
	expect(setUser).toHaveBeenNthCalledWith(1, { id: '42' });
	expect(setUser).toHaveBeenNthCalledWith(2, null);
});

it('SDK 호출이 실패해도 오류 화면의 보고 호출을 중단하지 않는다', () => {
	captureException.mockImplementation(() => {
		throw new Error('transport failed');
	});
	const tracker = new SentryErrorTracker();
	expect(() => tracker.captureException(new Error('render failed'))).not.toThrow();
	expect(warning).toHaveBeenCalledOnce();
});
