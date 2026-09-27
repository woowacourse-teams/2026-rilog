import * as Sentry from '@sentry/nextjs';
import { afterAll, expect, it, vi } from 'vitest';

import { createApiFailure } from '@/test/fixtures/api-error';

import { apiErrorReporter } from './api-error-reporter-instance';
import { initializeSentry } from './initialize-sentry';

const { envelopes } = vi.hoisted(() => ({ envelopes: [] as unknown[] }));

// SDK 이벤트 처리와 직렬화는 실제 구현을 실행하고 네트워크 전송만 대체한다.
vi.mock('@sentry/nextjs', async (importOriginal) => {
	const imported = await importOriginal<typeof Sentry & { default?: typeof Sentry }>();
	const sdk = imported.default ?? imported;
	return {
		...sdk,
		init: (options: Parameters<typeof sdk.init>[0]) =>
			sdk.init({
				...options,
				enabled: true,
				dsn: 'https://public@example.invalid/1',
				release: 'test-release',
				defaultIntegrations: [],
				integrations: [],
				transport: () => ({
					send: (envelope: unknown) => {
						envelopes.push(envelope);
						return Promise.resolve({});
					},
					flush: () => Promise.resolve(true),
				}),
			}),
	};
});

afterAll(async () => {
	await Sentry.close(1000);
});

it('실제 SDK 전송 묶음에서 일반·API 오류와 첨부파일의 민감정보를 차단한다', async () => {
	initializeSentry();
	const secret = 'PRIVATE_SECRET_MARKER';
	Sentry.withScope((scope) => {
		scope.setUser({ email: secret });
		scope.setExtra('body', secret);
		scope.addAttachment({ filename: `${secret}.txt`, data: secret });
		Sentry.captureEvent({
			request: {
				url: `https://rilog.test/${secret}/posts/42?code=${secret}`,
				headers: { Authorization: secret, Cookie: secret },
			},
			exception: {
				values: [
					{
						type: 'TypeError',
						value: secret,
						stacktrace: {
							frames: [{ filename: `app:///_next/static/chunks/123abc.js?token=${secret}`, lineno: 12, colno: 34 }],
						},
					},
				],
			},
		});
	});
	Sentry.captureMessage(secret);
	Sentry.captureEvent({
		type: 'transaction',
		transaction: `/alice/posts/42?code=${secret}`,
		start_timestamp: 1,
		timestamp: 2,
		contexts: {
			trace: { trace_id: '11111111111111111111111111111111', span_id: '2222222222222222', data: { body: secret } },
		},
		spans: [
			{
				span_id: '3333333333333333',
				trace_id: '11111111111111111111111111111111',
				start_timestamp: 1,
				timestamp: 2,
				description: `https://storage.test/${secret}?signature=${secret}`,
				data: { body: secret },
			},
		],
	});
	const apiError = await createApiFailure('INTERNAL_SERVER_ERROR', 500);
	apiErrorReporter.report(apiError, { operation: 'draft.save' });
	Sentry.captureException(apiError);
	await Sentry.flush(1000);

	const serialized = JSON.stringify(envelopes);
	expect(serialized).not.toContain(secret);
	expect(serialized).not.toContain('"type":"attachment"');
	expect(serialized).toContain('"api_error_code":"INTERNAL_SERVER_ERROR"');
	expect(serialized).toContain('"route":"/[slug]/posts/[postId]"');
	expect(serialized).toContain('"release":"test-release"');
	expect(serialized).toContain('"lineno":12');
	const items = (envelopes as [unknown, [{ type: string }, unknown][]][]).flatMap((envelope) => envelope[1]);
	// SDK 누락 통계(client_report)는 오류·성능 이벤트와 별도로 센다.
	expect(items.filter(([header]) => header.type === 'event')).toHaveLength(3);
	expect(items.filter(([header]) => header.type === 'transaction')).toHaveLength(1);
});
