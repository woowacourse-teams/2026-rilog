import ky from 'ky';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ErrorTrackerContext } from './error-tracker';

import { normalizeApiError } from '@/shared/api/api-error';

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

it('정규화된 API 오류는 원본 발생 위치와 분류만 보내고 응답·토큰·원본 cause를 보내지 않는다', async () => {
	const original = await ky
		.get('https://api.rilog.test/callback?code=secret-token', {
			retry: 0,
			fetch: () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							status: 400,
							error: 'BAD_REQUEST',
							errorCode: 'INVALID_POST_CONTENT',
							message: 'private-content',
							invalidParams: [{ name: 'content', reason: 'private-content' }],
						}),
						{ status: 400, headers: { 'Content-Type': 'application/json' } },
					),
				),
		})
		.catch((error: unknown) => error);
	if (!(original instanceof Error)) throw new Error('Expected HTTPError');
	original.stack = `${original.name}: ${original.message}\n    at publish (https://rilog.test/app.js?code=secret-token:12:34)`;
	createSentryErrorTracker().captureException(normalizeApiError(original), {
		tags: { operation: 'post.publish' },
		extra: { original, content: 'private-content' },
	});
	const [reported, context] = captureExceptionMock.mock.calls[0] as [unknown, ErrorTrackerContext];
	expect(reported).toBeInstanceOf(Error);
	if (!(reported instanceof Error)) throw new Error('Expected a reportable Error');
	expect(reported).not.toBe(original);
	expect(reported.stack).toContain('at publish (https://rilog.test/app.js:12:34)');
	expect(reported.cause).toBeUndefined();
	expect(context.tags).toMatchObject({ operation: 'post.publish', error_code: 'INVALID_POST_CONTENT', status: '400' });
	expect(`${reported.stack} ${JSON.stringify([reported, context])}`).not.toMatch(/secret-token|private-content/);
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
