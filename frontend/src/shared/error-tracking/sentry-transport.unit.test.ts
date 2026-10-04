import * as Sentry from '@sentry/nextjs';
import { afterAll, expect, it, vi } from 'vitest';

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

it('실제 SDK 전송에서 원본 오류, API 맥락, 사용자 ID를 유지하고 민감정보를 제거한다', async () => {
	initializeSentry();
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
	expect(sent).toContain('api_request');
	expect(sent).toContain('api_response');
	expect(sent).toContain('"id":"42"');
	expect(sent).not.toContain('private-code');
});
