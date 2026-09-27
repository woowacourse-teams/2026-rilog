import { NetworkError } from 'ky';
import { describe, expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/nextjs';

import { normalizeApiError } from '@/shared/api/api-error';
import { createApiFailure } from '@/test/fixtures/api-error';

import { createApiErrorReport, sanitizeApiErrorEvent } from './sentry-api-error';
import { SentryErrorTracker } from './sentry-error-tracker';

describe('Sentry API 오류 전송 경계', () => {
	it('자동 수집된 원본 ky 네트워크 오류에서도 URL과 cause를 제거하고 분류를 보존한다', () => {
		const original = new NetworkError(new Request('https://api.test?token=private-token'), {
			cause: new TypeError('private-message'),
		});
		const sent = new SentryErrorTracker().beforeSend(
			{
				type: undefined,
				request: { url: original.request.url },
				extra: { original },
				exception: { values: [{ value: original.message }] },
			},
			{ originalException: original },
		);
		expect(sent.tags).toMatchObject({
			feature: 'api',
			operation: 'unhandled',
			error_type: 'network',
			httpStatus: 'NO_RESPONSE',
		});
		expect(JSON.stringify(sent)).not.toContain('private-');
	});
	it('SDK가 추가한 민감정보와 연결된 예외를 제거하면서 발생 위치를 보존한다', () => {
		const report = createApiErrorReport(normalizeApiError(new TypeError('private-message')), 'post.publish');
		const event: ErrorEvent = {
			type: undefined,
			event_id: 'test-event',
			release: 'test-release',
			message: 'private-message',
			logentry: { message: 'private-message' },
			user: { email: 'private-email' },
			request: { url: 'https://rilog.test?code=private-token' },
			breadcrumbs: [{ message: 'private-content' }],
			extra: { __serialized__: 'private-body' },
			contexts: { custom: { token: 'private-token' } },
			tags: { secret: 'private-tag' },
			exception: {
				values: [
					{ type: 'HTTPError', value: 'private-cause' },
					{
						type: 'TypeError',
						value: 'private-message',
						stacktrace: {
							frames: [
								{
									filename: 'https://rilog.test/app.js?code=private-token',
									function: 'publish',
									lineno: 12,
									colno: 34,
									vars: { input: 'private-content' },
									context_line: 'private-content',
								},
							],
						},
					},
				],
			},
		};
		const sanitized = sanitizeApiErrorEvent(event, report);
		if (!sanitized) throw new Error('Expected event');

		expect(JSON.stringify(sanitized)).not.toContain('private-');
		expect(sanitized).toMatchObject({
			event_id: 'test-event',
			release: 'test-release',
			tags: { operation: 'post.publish' },
		});
		expect(sanitized.exception?.values).toHaveLength(1);
		expect(sanitized.exception?.values?.[0]?.stacktrace?.frames).toEqual([
			{ filename: 'https://rilog.test/app.js', function: 'publish', lineno: 12, colno: 34, in_app: undefined },
		]);
	});

	it('정규화 객체가 자동 수집되어도 원본 cause와 직렬화한 본문을 전송하지 않는다', () => {
		const normalized = normalizeApiError(new TypeError('private-message'));
		const event: ErrorEvent = {
			type: undefined,
			extra: { __serialized__: normalized },
			exception: { values: [{ value: 'private-message' }] },
		};
		const sanitized = new SentryErrorTracker().beforeSend(event, { originalException: normalized });
		if (!sanitized) throw new Error('Expected event');
		expect(sanitized.exception?.values?.[0]?.value).toBe(
			'[api] unhandled failed: NO_ERROR_CODE (NO_RESPONSE; network)',
		);
		expect(JSON.stringify(sanitized)).not.toContain('private-message');
	});

	it('Firefox 형식의 원본 스택도 보존하고 URL fragment는 제거한다', () => {
		const original = new TypeError('private-message');
		original.stack = 'publish@https://rilog.test/app.js#private-token:12:34';
		const report = createApiErrorReport(normalizeApiError(original));
		expect(report.error.stack).toContain('publish@https://rilog.test/app.js:12:34');
		expect(report.error.stack).not.toContain('private-');
	});

	it('원본 스택이 없는 오류는 보고 함수의 위치를 발생 위치로 대체하지 않는다', () => {
		const report = createApiErrorReport(normalizeApiError('private-value'));
		expect(report.error.stack?.split('\n')).toHaveLength(1);
	});

	it('일반 애플리케이션 오류의 기존 보고는 변경하지 않는다', () => {
		const event: ErrorEvent = { type: undefined, exception: { values: [{ value: 'render failed' }] } };
		expect(new SentryErrorTracker().beforeSend(event, { originalException: new Error('render failed') })).toBe(event);
	});

	it('제목과 태그에 고정 작업 분류를 넣고 request_id는 태그로만 보존한다', async () => {
		const error = await createApiFailure('INVALID_POST_CONTENT', 400);
		if (!('response' in error)) throw new Error('Expected HTTP response');
		const requestId = '12345678-1234-4567-8123-123456789abc';
		error.response.headers.set('X-Request-ID', requestId);
		const report = createApiErrorReport(error, 'draft.publish');
		expect(report.error.message).toBe('[writing] draft.publish failed: INVALID_POST_CONTENT (400; api)');
		expect(report.tags).toMatchObject({
			feature: 'writing',
			operation: 'draft.publish',
			errorCode: 'INVALID_POST_CONTENT',
			httpStatus: '400',
			request_id: requestId,
		});
		const sent = sanitizeApiErrorEvent({ type: undefined, tags: { feature: 'private-input' } }, report);
		expect(sent.tags).toEqual(report.tags);
		expect(sent.exception?.values?.[0]?.value).toBe(report.error.message);
		error.response.headers.set('X-Request-ID', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
		expect(createApiErrorReport(error, 'draft.publish').error.message).toBe(report.error.message);
	});

	it.each(['private-request-id', '-'.repeat(36)])(
		'계약에 맞지 않는 request_id %s는 전송하지 않는다',
		async (requestId) => {
			const error = await createApiFailure('NEW_PUBLIC_CODE', 503);
			if (!('response' in error)) throw new Error('Expected HTTP response');
			error.response.headers.set('X-Request-ID', requestId);
			const report = createApiErrorReport(error, 'oauth.callback');
			expect(report.tags).toMatchObject({ feature: 'auth', errorCode: 'NEW_PUBLIC_CODE', httpStatus: '503' });
			expect(report.tags).not.toHaveProperty('request_id');
		},
	);

	it('임의 operation과 서버 문구를 제목·태그에 넣지 않고 안전한 기본값을 쓴다', async () => {
		const report = createApiErrorReport(await createApiFailure('private token value', 400), 'private.operation');
		expect(report.tags).toMatchObject({ feature: 'api', operation: 'unhandled', errorCode: 'UNKNOWN_ERROR_CODE' });
		expect(JSON.stringify(report.tags) + report.error.message).not.toContain('private');
		const network = createApiErrorReport(normalizeApiError(new TypeError('private')), 'upload.put');
		expect(network.tags).toMatchObject({
			feature: 'upload',
			operation: 'upload.put',
			errorCode: 'NO_ERROR_CODE',
			httpStatus: 'NO_RESPONSE',
		});
		expect(network.tags).not.toHaveProperty('request_id');
	});
});
