import { describe, expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/nextjs';

import { normalizeApiError } from '@/shared/api/api-error';

import { createApiErrorReport, sanitizeApiErrorEvent } from './sentry-api-error';

describe('Sentry API 오류 전송 경계', () => {
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
		const sanitized = sanitizeApiErrorEvent(event, { originalException: report.error });

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
		const sanitized = sanitizeApiErrorEvent(event, { originalException: normalized });
		expect(sanitized.exception?.values?.[0]?.value).toBe('API request failed: network');
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
		expect(sanitizeApiErrorEvent(event, { originalException: new Error('render failed') })).toBe(event);
	});
});
