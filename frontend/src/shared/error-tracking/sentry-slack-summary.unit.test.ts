import { expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/nextjs';

import { parseSentrySlackSummary, summarizeSentryEventForSlack } from './sentry-slack-summary';

const EVENT_ID = '0123456789abcdef0123456789abcdef';

it('SDK 오류에서 제목과 허용한 태그, 최근 자동 breadcrumb만 Slack 요약에 담는다', () => {
	const event = {
		type: undefined,
		event_id: EVENT_ID,
		message: 'POST failed at https://api.rilog.kr/v1/posts?token=private',
		request: { url: 'https://www.rilog.kr/write?draft=private' },
		release: '572ccedd',
		environment: 'prod',
		exception: { values: [{ type: 'TypeError' }] },
		tags: { operation: 'post.publish', http_status: '503', request_id: 'do-not-send', secret: 'private' },
		user: { id: 'user-42' },
		breadcrumbs: [
			{ category: 'console', message: 'password=private' },
			{
				category: 'fetch',
				message: 'GET https://api.rilog.kr/v1/posts?token=private',
				data: { method: 'GET', status_code: 503 },
			},
			{ category: 'navigation', message: 'https://rilog.kr/private-draft' },
			{ category: 'ui.click', message: 'input[value=private]' },
		],
	} as ErrorEvent;
	const summary = summarizeSentryEventForSlack(event);
	expect(summary).toEqual({
		eventId: EVENT_ID,
		title: 'POST failed at [URL]',
		errorType: 'TypeError',
		route: '/write',
		tags: { operation: 'post.publish', http_status: '503', release: '572ccedd', environment: 'prod' },
		breadcrumbs: ['fetch GET /v1/posts 503', 'navigation', 'ui.click input'],
	});
	expect(JSON.stringify(summary)).not.toContain('private');
	expect(JSON.stringify(summary)).not.toContain('user-42');
});

it('외부 요청이 임의의 태그나 긴 breadcrumb를 추가하면 거절한다', () => {
	const summary = {
		eventId: EVENT_ID,
		title: 'Error',
		errorType: 'Error',
		route: '/write',
		tags: { secret: 'private' },
		breadcrumbs: ['navigation'],
	};
	expect(parseSentrySlackSummary(summary)).toBeNull();
	expect(parseSentrySlackSummary({ ...summary, tags: {}, breadcrumbs: ['x'.repeat(141)] })).toBeNull();
});
