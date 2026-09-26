import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSentryErrorTracker } from './sentry-error-tracker';

const { captureExceptionMock, captureMessageMock } = vi.hoisted(() => ({
	captureExceptionMock: vi.fn(),
	captureMessageMock: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
	captureException: captureExceptionMock,
	captureMessage: captureMessageMock,
}));

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe.each([
	{ method: 'captureException', captureMock: captureExceptionMock, value: new Error('test') },
	{ method: 'captureMessage', captureMock: captureMessageMock, value: 'test message' },
])('$method', ({ captureMock, value }) => {
	it.each(['development', 'production'])(
		'%s에서 SDK 실패가 호출자에게 전파되지 않고 다음 전송도 가능하다',
		(environment) => {
			vi.stubEnv('NODE_ENV', environment);
			const tracker = createSentryErrorTracker();
			captureMock.mockImplementationOnce(() => {
				throw new Error('SDK capture failed');
			});
			const context = { tags: { operation: 'test' }, extra: { attempt: 2 } };

			const capture = () => {
				if (typeof value === 'string') {
					tracker.captureMessage(value, context);
				} else {
					tracker.captureException(value, context);
				}
			};

			expect(capture).not.toThrow();
			capture();

			expect(captureMock).toHaveBeenCalledTimes(2);
			expect(captureMock).toHaveBeenLastCalledWith(value, context);
			if (environment === 'production') {
				expect(console.warn).not.toHaveBeenCalled();
			} else {
				expect(console.warn).toHaveBeenCalled();
			}
		},
	);
});
