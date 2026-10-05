import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { deliverSentrySlackAlert } from './sentry-slack-delivery';

it('허용한 요약만 Slack에 전송하고 같은 오류의 반복 알림을 억제한다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
	const post = vi.fn().mockResolvedValue({ ok: true });
	vi.stubGlobal('fetch', post);
	const summary = {
		eventId: '0123456789abcdef0123456789abcdef',
		title: '게시물 저장 실패',
		errorType: 'TypeError',
		route: '/write',
		tags: { operation: 'post.publish', http_status: '503', environment: 'prod' },
		breadcrumbs: ['fetch POST 503', 'ui.click'],
	};
	await deliverSentrySlackAlert(summary, 'test-ip');
	await deliverSentrySlackAlert({ ...summary, eventId: 'fedcba9876543210fedcba9876543210' }, 'test-ip');
	expect(post).toHaveBeenCalledOnce();
	const [url, request] = post.mock.calls[0] as [string, RequestInit];
	expect(url).toBe('https://hooks.slack.com/services/test');
	expect(request.body).not.toContain('fetch POST 503');
	expect(request.body).toContain('post.publish');
	expect(request.body).toContain(summary.eventId);
	expect(request.body).toContain('/write');
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('Bot Token이 있으면 본문을 보내고 받은 ts로 breadcrumbs를 댓글에 단다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', 'xoxb-test');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', 'C123456');
	const post = vi
		.fn()
		.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, ts: '123.456' }) })
		.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, ts: '123.457' }) });
	vi.stubGlobal('fetch', post);
	const delivered = await deliverSentrySlackAlert(
		{
			eventId: '11111111111111111111111111111111',
			title: 'Request failed with status code 503',
			errorType: 'HTTPError',
			route: '/write',
			tags: { operation: 'post.publish', http_status: '503' },
			breadcrumbs: ['fetch POST /v1/posts 503'],
		},
		'bot-test-ip',
	);
	expect(delivered).toBe(true);
	expect(post).toHaveBeenCalledTimes(2);
	const parent = JSON.parse((post.mock.calls[0] as [string, RequestInit])[1].body as string) as {
		text: string;
		blocks: unknown[];
	};
	const reply = JSON.parse((post.mock.calls[1] as [string, RequestInit])[1].body as string) as {
		thread_ts: string;
		text: string;
	};
	expect(parent.text).toContain('🔴 HTTPError');
	expect(parent.text).toContain('/write');
	expect(parent.text).toContain('Sentry event ID: 11111111111111111111111111111111');
	expect(parent.text).not.toContain('fetch POST');
	expect(reply.thread_ts).toBe('123.456');
	expect(reply.text).toContain('fetch POST /v1/posts 503');
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('Slack API가 HTTP 200에 ok=false를 반환하면 알림 실패로 처리한다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', 'xoxb-test');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', 'C123456');
	const post = vi.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ ok: false, error: 'not_in_channel' }),
	});
	vi.stubGlobal('fetch', post);
	const delivered = await deliverSentrySlackAlert(
		{
			eventId: '22222222222222222222222222222222',
			title: '댓글 쓰기 실패',
			errorType: 'HTTPError',
			route: '/[slug]/posts/[postId]',
			tags: { operation: 'comment.create' },
			breadcrumbs: ['fetch POST /v1/comments 503'],
		},
		'bot-error-test-ip',
	);
	expect(delivered).toBe(false);
	expect(post).toHaveBeenCalledOnce();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
