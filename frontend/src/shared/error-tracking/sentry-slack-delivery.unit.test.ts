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
		breadcrumbs: [{ category: 'fetch', method: 'POST', statusCode: 503 }, { category: 'ui.click' }],
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
		.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true, ts: '123.457' }) });
	vi.stubGlobal('fetch', post);
	const delivered = await deliverSentrySlackAlert(
		{
			eventId: '11111111111111111111111111111111',
			title: 'Request failed with status code 503',
			errorType: 'HTTPError',
			route: '/write',
			tags: { operation: 'post.publish', http_status: '503' },
			sessionReplayUrl: 'https://us.posthog.com/project/phc_test/replay/session-1?t=30',
			breadcrumbs: [
				{ category: 'navigation', from: '/feed', to: '/write' },
				{
					category: 'ui.click',
					element: 'button',
					selector: 'button.publish[type="submit"]',
					attributes: { class: 'publish', type: 'submit' },
				},
				{
					category: 'fetch',
					method: 'POST',
					url: 'https://api.rilog.test/v1/posts',
					statusCode: 503,
				},
			],
		},
		'bot-test-ip',
	);
	expect(delivered).toBe(true);
	expect(post).toHaveBeenCalledTimes(4);
	const parent = JSON.parse((post.mock.calls[0] as [string, RequestInit])[1].body as string) as {
		text: string;
		blocks: Array<{ type: string; text?: { text: string } }>;
	};
	const reply = JSON.parse((post.mock.calls[1] as [string, RequestInit])[1].body as string) as {
		thread_ts: string;
		text: string;
	};
	expect(parent.text).toContain('🔴 HTTPError');
	expect(parent.text).toContain('/write');
	expect(parent.text).toContain('Sentry event ID: 11111111111111111111111111111111');
	expect(parent.text).toContain(
		'PostHog session replay: https://us.posthog.com/project/phc_test/replay/session-1?t=30',
	);
	expect(
		parent.blocks.some(
			(block) =>
				block.text?.text ===
				'<https://us.posthog.com/project/phc_test/replay/session-1?t=30|PostHog session replay 보기>',
		),
	).toBe(true);
	expect(parent.text).not.toContain('fetch POST');
	expect(parent.blocks.some((block) => block.text?.text === '```operation: post.publish\nhttp_status: 503```')).toBe(
		true,
	);
	expect(reply.thread_ts).toBe('123.456');
	expect(reply.text).toContain('category: navigation');
	expect(reply.text).toContain('from: /feed');
	const secondReply = JSON.parse((post.mock.calls[2] as [string, RequestInit])[1].body as string) as { text: string };
	const thirdReply = JSON.parse((post.mock.calls[3] as [string, RequestInit])[1].body as string) as { text: string };
	expect(secondReply.text).toContain('category: ui.click');
	expect(secondReply.text).toContain('attributes:\n  class: publish\n  type: submit');
	expect(thirdReply.text).toContain('https://api.rilog.test/v1/posts');
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
			breadcrumbs: [{ category: 'fetch', method: 'POST', statusCode: 503 }],
		},
		'bot-error-test-ip',
	);
	expect(delivered).toBe(false);
	expect(post).toHaveBeenCalledOnce();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
