import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { deliverSentrySlackAlert } from './sentry-slack-delivery';

it('허용한 요약만 Slack에 전송하고 같은 오류의 반복 알림을 억제한다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	const post = vi.fn().mockResolvedValue({ ok: true });
	vi.stubGlobal('fetch', post);
	const summary = {
		eventId: '0123456789abcdef0123456789abcdef',
		title: '게시물 저장 실패',
		errorType: 'TypeError',
		tags: { operation: 'post.publish', http_status: '503', environment: 'prod' },
		breadcrumbs: ['fetch POST 503', 'ui.click'],
	};
	await deliverSentrySlackAlert(summary, 'test-ip');
	await deliverSentrySlackAlert({ ...summary, eventId: 'fedcba9876543210fedcba9876543210' }, 'test-ip');
	expect(post).toHaveBeenCalledOnce();
	const [url, request] = post.mock.calls[0] as [string, RequestInit];
	expect(url).toBe('https://hooks.slack.com/services/test');
	expect(request.body).toContain('fetch POST 503');
	expect(request.body).toContain('post.publish');
	expect(request.body).toContain(summary.eventId);
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});
