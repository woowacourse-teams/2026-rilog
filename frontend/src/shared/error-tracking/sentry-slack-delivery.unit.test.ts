import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { deliverSentrySlackAlert, resolveSentrySlackAlertLevel } from './sentry-slack-delivery';

beforeEach(() => {
	vi.stubEnv('SENTRY_SLACK_MODE', 'webhook');
	vi.stubEnv('SENTRY_WEBHOOK_ORG', 'rilog-frontend');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'prod');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.rilog.kr');
});

it('검증된 이벤트 링크와 허용한 요약을 Slack에 전송한다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
	const post = vi.fn().mockResolvedValue({ ok: true });
	vi.stubGlobal('fetch', post);
	const summary = {
		eventId: '0123456789abcdef0123456789abcdef',
		title: '게시물 저장 실패',
		apiRequest: {
			method: 'POST',
			url: 'https://api.rilog.kr/v1/posts/[id]/views',
			statusCode: 500,
			requestId: '671a5cb0-bfc5-4cab-b9bf-42044df2b76d',
		},
		errorType: 'TypeError',
		route: '/write',
		tags: { operation: 'post.publish', http_status: '503', environment: 'prod' },
		breadcrumbs: [{ category: 'fetch', method: 'POST', statusCode: 503 }, { category: 'ui.click' }],
	};
	await deliverSentrySlackAlert(summary, `https://rilog-frontend.sentry.io/issues/123/events/${summary.eventId}/`);
	expect(post).toHaveBeenCalledOnce();
	const [url, request] = post.mock.calls[0] as [string, RequestInit];
	expect(url).toBe('https://hooks.slack.com/services/test');
	expect(request.body).not.toContain('fetch POST 503');
	expect(request.body).toContain('post.publish');
	expect(request.body).toContain(summary.eventId);
	expect(request.body).toContain(`https://rilog-frontend.sentry.io/issues/123/events/${summary.eventId}/`);
	expect(request.body).not.toContain('SDK 전송 전');
	expect(request.body).toContain('/write');
	expect(request.body).toContain('원인 요청');
	expect(request.body).toContain('671a5cb0-bfc5-4cab-b9bf-42044df2b76d');
	expect(request.body).toContain('https://api.rilog.kr/v1/posts/[id]/views');
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('Bot Token이 있으면 최근 흐름을 본문 하나에 포함하고 댓글은 보내지 않는다', async () => {
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
			sessionReplayUrl: 'https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
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
		'https://rilog-frontend.sentry.io/issues/123/events/11111111111111111111111111111111/',
	);
	expect(delivered).toBe(true);
	expect(post).toHaveBeenCalledOnce();
	const parent = JSON.parse((post.mock.calls[0] as [string, RequestInit])[1].body as string) as {
		text: string;
		blocks: Array<{ type: string; text?: { text: string } }>;
	};
	expect(parent.text).toContain('🔴 HTTPError');
	expect(parent.text).toContain('/write');
	expect(parent.text).toContain('Sentry event ID: 11111111111111111111111111111111');
	expect(parent.text).toContain(
		'PostHog session replay: https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
	);
	expect(
		parent.blocks.some(
			(block) =>
				block.text?.text ===
				'<https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30|PostHog session replay 보기>',
		),
	).toBe(true);
	expect(parent.text).not.toContain('fetch POST');
	expect(parent.blocks.some((block) => block.text?.text === '```operation: post.publish\nhttp_status: 503```')).toBe(
		true,
	);
	expect(parent.text).toContain('category: navigation');
	expect(parent.text).toContain('attributes:\n  class: publish\n  type: submit');
	expect(parent.text).toContain('https://api.rilog.test/v1/posts');
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
		'https://rilog-frontend.sentry.io/issues/123/events/22222222222222222222222222222222/',
	);
	expect(delivered).toBe(false);
	expect(post).toHaveBeenCalledOnce();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('Slack 429 응답의 Retry-After 전체 시간이 지난 뒤 재시도한다', async () => {
	vi.useFakeTimers();
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
	const post = vi
		.fn()
		.mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ 'Retry-After': '30' }) })
		.mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers() });
	vi.stubGlobal('fetch', post);

	const delivery = deliverSentrySlackAlert(
		{
			eventId: '33333333333333333333333333333333',
			title: '429 재시도 검증',
			errorType: 'HTTPError',
			route: '/write',
			tags: { operation: 'post.publish', http_status: '429' },
			breadcrumbs: [],
		},
		'https://rilog-frontend.sentry.io/issues/123/events/33333333333333333333333333333333/',
	);
	await vi.advanceTimersByTimeAsync(29_999);
	expect(post).toHaveBeenCalledOnce();
	await vi.advanceTimersByTimeAsync(1);
	await expect(delivery).resolves.toBe(true);
	expect(post).toHaveBeenCalledTimes(2);

	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('Slack 본문 전송이 재시도 후 실패하면 같은 이벤트의 다음 전달을 허용한다', async () => {
	vi.useFakeTimers();
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
	const failedResponse = { ok: false, status: 503, headers: new Headers() };
	const post = vi.fn().mockResolvedValueOnce(failedResponse).mockResolvedValueOnce(failedResponse).mockResolvedValue({
		ok: true,
		status: 200,
		headers: new Headers(),
	});
	vi.stubGlobal('fetch', post);
	const summary = {
		eventId: '44444444444444444444444444444444',
		title: '본문 재시도 보존 검증',
		errorType: 'HTTPError',
		route: '/write',
		tags: { operation: 'post.publish', http_status: '503' },
		breadcrumbs: [],
	};

	const firstDelivery = deliverSentrySlackAlert(
		summary,
		`https://rilog-frontend.sentry.io/issues/123/events/${summary.eventId}/`,
	);
	await vi.advanceTimersByTimeAsync(1000);
	await expect(firstDelivery).resolves.toBe(false);
	await expect(
		deliverSentrySlackAlert(summary, `https://rilog-frontend.sentry.io/issues/123/events/${summary.eventId}/`),
	).resolves.toBe(true);
	expect(post).toHaveBeenCalledTimes(3);

	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it('webhook 모드는 검증된 event 링크만 전송한다', async () => {
	vi.stubEnv('SENTRY_SLACK_MODE', 'webhook');
	vi.stubEnv('SENTRY_WEBHOOK_ORG', 'rilog-frontend');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
	const post = vi.fn().mockResolvedValue({ ok: true });
	vi.stubGlobal('fetch', post);
	const summary = {
		eventId: '77777777777777777777777777777777',
		title: 'test',
		errorType: 'Error',
		route: '/write',
		tags: { environment: 'prod' },
		breadcrumbs: [],
	};
	const eventUrl = `https://rilog-frontend.sentry.io/issues/123/events/${summary.eventId}/`;
	expect(await deliverSentrySlackAlert(summary, 'https://attacker.example/')).toBe(false);
	expect(post).not.toHaveBeenCalled();
	expect(await deliverSentrySlackAlert(summary, eventUrl)).toBe(true);
	const [, request] = post.mock.calls[0] as [string, RequestInit];
	expect(request.body).toContain(eventUrl);
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it.each([
	[{}, 'error', '🔴'],
	[{ error_kind: 'server_response' }, 'error', '🔴'],
	[{ error_kind: 'storage_rejected' }, 'error', '🔴'],
	[{ error_kind: 'unexpected_response' }, 'error', '🔴'],
	[{ error_kind: 'rate_limit' }, 'warn', '🟡'],
	[{ error_kind: 'timeout' }, 'warn', '🟡'],
	[{ error_kind: 'unknown' }, 'warn', '🟡'],
	[{ error_kind: 'network', user_impact: 'save_failed' }, 'warn', '🟡'],
	[{ error_kind: 'network', user_impact: 'action_failed' }, 'warn', '🟡'],
	[{ error_kind: 'network', user_impact: 'load_failed' }, 'info', '🟢'],
	[{ error_kind: 'network' }, 'info', '🟢'],
] as const)(
	'오류 태그 %o는 중요도 %s(%s)와 Sentry 바로가기 링크로 Slack 본문을 구성한다',
	async (tags, expectedLevel, expectedBadge) => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/test');
		vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', '');
		vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', '');
		const post = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', post);
		expect(resolveSentrySlackAlertLevel(tags)).toBe(expectedLevel);

		const eventId = `888888888888888888888888888888${expectedLevel === 'error' ? '01' : expectedLevel === 'warn' ? '02' : '03'}`;
		await expect(
			deliverSentrySlackAlert(
				{
					eventId,
					title: `${expectedLevel}-${JSON.stringify(tags)}`,
					errorType: 'HTTPError',
					route: '/feeds',
					tags,
					breadcrumbs: [],
				},
				`https://rilog-frontend.sentry.io/issues/123/events/${eventId}/`,
			),
		).resolves.toBe(true);
		const payload = JSON.parse((post.mock.calls[0] as [string, RequestInit])[1].body as string) as {
			text: string;
			blocks: Array<{ type: string; text?: { text: string }; elements?: Array<{ text: string }> }>;
		};
		expect(payload.text.startsWith(`${expectedBadge} HTTPError`)).toBe(true);
		expect(payload.blocks[0]?.text?.text).toBe(`${expectedBadge} *HTTPError*`);
		expect(payload.text).toContain(`https://rilog-frontend.sentry.io/issues/123/events/${eventId}/`);
		expect(
			payload.blocks.some((block) =>
				block.elements?.some((el) =>
					el.text.includes(`<https://rilog-frontend.sentry.io/issues/123/events/${eventId}/|Sentry 이벤트 보기>`),
				),
			),
		).toBe(true);
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	},
);

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it.each([undefined, '', 'legacy', 'off', 'invalid'])(
	'서버 모드 %s에서는 공개 webhook 모드를 상속해도 전송하지 않는다',
	async (mode) => {
		vi.stubEnv('SENTRY_SLACK_MODE', mode);
		vi.stubEnv('NEXT_PUBLIC_SENTRY_SLACK_MODE', 'webhook');
		const post = vi.fn();
		vi.stubGlobal('fetch', post);
		await expect(
			deliverSentrySlackAlert(
				{ eventId: '1'.repeat(32), title: 'Error', errorType: 'Error', route: '/write', tags: {}, breadcrumbs: [] },
				`https://rilog-frontend.sentry.io/issues/123/events/${'1'.repeat(32)}/`,
			),
		).resolves.toBe(false);
		expect(post).not.toHaveBeenCalled();
	},
);

it.each([
	'https://attacker.example/',
	`https://other.sentry.io/issues/123/events/${'1'.repeat(32)}/`,
	`https://user:private@rilog-frontend.sentry.io/issues/123/events/${'1'.repeat(32)}/`,
	`https://rilog-frontend.sentry.io/issues/123/events/${'1'.repeat(32)}/?token=private`,
	`https://rilog-frontend.sentry.io/issues/123/events/${'1'.repeat(32)}/#private`,
	`https://rilog-frontend.sentry.io/issues/123/events/${'2'.repeat(32)}/`,
	'not-a-url',
])('검증되지 않은 이벤트 URL %s는 전송하지 않는다', async (eventUrl) => {
	const post = vi.fn();
	vi.stubGlobal('fetch', post);
	await expect(
		deliverSentrySlackAlert(
			{ eventId: '1'.repeat(32), title: 'Error', errorType: 'Error', route: '/write', tags: {}, breadcrumbs: [] },
			eventUrl,
		),
	).resolves.toBe(false);
	expect(post).not.toHaveBeenCalled();
});
