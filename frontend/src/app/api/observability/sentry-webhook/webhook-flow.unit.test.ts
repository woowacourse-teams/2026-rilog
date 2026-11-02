import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { POST as legacyPost } from '@/app/api/observability/sentry-slack/route';

import { POST } from './route';

it.each(['success', 'retry'])(
	'서명 검증부터 영속 중복 검사·Slack 포맷까지 연결하고 전송 결과 %s를 처리한다',
	async (result) => {
		const directory = await mkdtemp(join(tmpdir(), 'rilog-sentry-flow-'));
		const secret = 'fixture-client-secret-at-least-32-characters';
		vi.stubEnv('SENTRY_SLACK_MODE', 'webhook');
		vi.stubEnv('SENTRY_WEBHOOK_CLIENT_SECRET', secret);
		vi.stubEnv('SENTRY_WEBHOOK_PROJECT_ID', '1');
		vi.stubEnv('SENTRY_WEBHOOK_ORG', 'rilog-frontend');
		vi.stubEnv('SENTRY_SLACK_STATE_DIR', directory);
		vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/fixture');
		vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
		vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
		const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>().mockResolvedValue(new Response('ok'));
		if (result === 'retry') {
			fetch.mockResolvedValueOnce(new Response('', { status: 503, headers: { 'Retry-After': '0' } }));
			fetch.mockResolvedValueOnce(new Response('', { status: 503 }));
		}
		vi.stubGlobal('fetch', fetch);
		const body = JSON.stringify({
			action: 'triggered',
			data: {
				event: {
					project: 1,
					issue_id: '123',
					event_id: '11111111111111111111111111111111',
					environment: 'prod',
					level: 'error',
					contexts: {
						nextjs: { request_path: '/@private-slug/posts/42?token=private-value', secret: 'private-context' },
					},
					tags: [
						[
							'PostHog-Recording-URL',
							'https://us.posthog.com/project/123/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
						],
					],
					exception: {
						values: [{ type: 'HTTPError', value: 'POST https://api.rilog.kr/v1/posts?token=private-value' }],
					},
					request: { headers: { Authorization: 'Bearer private-value' }, data: 'private-body' },
					breadcrumbs: {
						values: [
							{
								category: 'fetch',
								data: { method: 'POST', url: 'https://api.rilog.kr/v1/posts?token=private-value', status_code: 503 },
							},
						],
					},
				},
			},
		});
		const createRequest = () =>
			new Request('https://www.rilog.kr/api/observability/sentry-webhook', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'sentry-hook-resource': 'event_alert',
					'sentry-hook-signature': createHmac('sha256', secret).update(body).digest('hex'),
				},
				body,
			});
		try {
			if (result === 'retry') expect((await POST(createRequest())).status).toBe(503);
			expect((await POST(createRequest())).status).toBe(204);
			expect((await POST(createRequest())).status).toBe(204);
			expect(fetch).toHaveBeenCalledTimes(result === 'retry' ? 3 : 1);
			const [url, init] = fetch.mock.calls[0];
			expect(url).toBe('https://hooks.slack.com/services/fixture');
			expect(init.body).toContain(
				'https://rilog-frontend.sentry.io/issues/123/events/11111111111111111111111111111111/',
			);
			expect(init.body).toContain('category: fetch');
			expect(init.body).toContain('/blog/[slug]/posts/[postId]');
			expect(init.body).not.toContain('private-slug');
			expect(init.body).not.toContain('private-context');
			expect(init.body).toContain(
				'https://us.posthog.com/project/123/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
			);
			expect(init.body).not.toContain('private-value');
			expect(init.body).not.toContain('private-body');
			expect(legacyPost().status).toBe(410);
			expect(fetch).toHaveBeenCalledTimes(result === 'retry' ? 3 : 1);
		} finally {
			vi.unstubAllEnvs();
			vi.unstubAllGlobals();
			await rm(directory, { recursive: true, force: true });
		}
	},
);
