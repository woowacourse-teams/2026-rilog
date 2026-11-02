import * as Sentry from '@sentry/nextjs';
import { afterAll, beforeEach, expect, it, vi } from 'vitest';

import { rememberApiRequest } from '@/shared/api/request-diagnostics';
import { createApiFailure } from '@/test/fixtures/api-error';

import { apiErrorReporter } from './api-error-reporter-instance';
import { errorTracker } from './error-tracker-instance';
import { initializeSentry } from './initialize-sentry';

const { envelopes } = vi.hoisted(() => ({ envelopes: [] as unknown[] }));

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

beforeEach(async () => {
	await Sentry.close(1000);
	Sentry.getCurrentScope().setClient(undefined);
	Sentry.getCurrentScope().clear();
	Sentry.setUser(null);
	envelopes.length = 0;
});

it('실제 SDK 전송에서 원본 오류, API 맥락, 사용자 ID를 유지하고 민감정보를 제거한다', async () => {
	initializeSentry({
		getSessionReplayUrl: () =>
			'https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
	});
	errorTracker.setUser('42');
	const error = await createApiFailure('INTERNAL_SERVER_ERROR', 500);
	rememberApiRequest(error.cause, 'POST', 'https://api.rilog.test/v1/posts?code=private-code');
	apiErrorReporter.report(error, { operation: 'post.publish' });
	Sentry.captureException(error.cause);
	await Sentry.flush(1000);
	expect(envelopes).toHaveLength(1);
	const sent = JSON.stringify(envelopes);
	expect(sent).toContain('INTERNAL_SERVER_ERROR');
	expect(sent).toContain('post.publish');
	expect(sent).toContain('server_response');
	expect(sent).toContain('user_impact');
	expect(sent).toContain('api_request');
	expect(sent).toContain('api_response');
	expect(sent).toContain('PostHog Recording URL');
	expect(sent).toContain('posthog_session_replay');
	expect(sent).toContain('https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30');
	expect(sent).toContain('"id":"42"');
	expect(sent).not.toContain('private-code');
});

it('실제 SDK 요청 문맥의 URL과 별도 query_string에서 민감 값을 제거한다', async () => {
	initializeSentry();
	Sentry.captureEvent({
		message: 'request query string privacy regression',
		request: {
			url: 'https://api.rilog.test/v1/search?email=person%40example.com&page=2',
			query_string: 'email=person%40example.com&nickname=private-nickname&content=private-content&page=2',
			headers: { 'Sentry-Hook-Signature': 'fixture-sdk-hook-signature' },
		},
	});
	await Sentry.flush(1000);

	expect(envelopes).toHaveLength(1);
	const sent = JSON.stringify(envelopes);
	expect(sent).toContain('page=2');
	expect(sent).not.toMatch(/person%40example\.com|private-nickname|private-content/);
	expect(sent).not.toContain('email=');
	expect(sent).not.toContain('fixture-sdk-hook-signature');
});

it('실제 SDK 전송에서도 임의 query·fragment·파일명·UI 속성을 제거하고 스택과 상관관계 ID를 보존한다', async () => {
	initializeSentry({
		getSessionReplayUrl: () =>
			'https://user:private-password@us.posthog.com/project/123/replay/01234567-89ab-cdef-0123-456789abcdef',
	});
	Sentry.captureEvent({
		message: 'Upload private-file.png failed at /feeds?custom=private-query#private-hash',
		request: {
			url: 'https://api.rilog.kr/v1/users/private-user?unexpected=private-query&page=2',
			headers: { 'X-Custom-Identity': 'private-header' },
		},
		tags: { operation: 'upload.put', request_id: '671a5cb0-bfc5-4cab-b9bf-42044df2b76d' },
		contexts: { upload: { filename: 'private-filename.png', headers: [['Authorization', 'private-token']] } },
		breadcrumbs: [
			{ category: 'ui.click', message: 'button#private-id[title="private-title"][type="submit"]' },
			{
				category: 'fetch',
				data: {
					method: 'PUT',
					url: 'https://storage.example/private-object?signature=private-signature',
					custom: 'private-custom',
				},
			},
			{ category: 'console', message: 'private-console' },
		],
		exception: {
			values: [
				{
					type: 'Error',
					value: 'Upload failed',
					stacktrace: {
						frames: [
							{ filename: 'app.js', abs_path: 'https://www.rilog.kr/_next/static/chunks/app.js', lineno: 12, colno: 3 },
						],
					},
				},
			],
		},
	});
	await Sentry.flush(1000);
	expect(envelopes).toHaveLength(1);
	const sent = JSON.stringify(envelopes);
	expect(sent).not.toMatch(/private-|storage.example|X-Custom-Identity/);
	expect(sent).toContain('app.js');
	expect(sent).toContain('"lineno":12');
	expect(sent).toContain('671a5cb0-bfc5-4cab-b9bf-42044df2b76d');
	expect(sent).toContain('upload.put');
	expect(sent).toContain('page=2');
	expect(sent).not.toContain('posthog_session_replay');
});
