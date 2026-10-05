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
			{
				category: 'ui.click',
				message: 'button#publish.primary[type="submit"][aria-label="발행"][value="private"]',
			},
		],
	} as ErrorEvent;
	const summary = summarizeSentryEventForSlack(event);
	expect(summary).toEqual({
		eventId: EVENT_ID,
		title: 'POST failed at https://api.rilog.kr/v1/posts',
		errorType: 'TypeError',
		route: '/write',
		tags: { operation: 'post.publish', http_status: '503', release: '572ccedd', environment: 'prod' },
		breadcrumbs: [
			{ category: 'fetch', method: 'GET', url: 'https://api.rilog.kr/v1/posts', statusCode: 503 },
			{ category: 'navigation' },
			{
				category: 'ui.click',
				element: 'button',
				selector: 'button#publish.primary[type="submit"][aria-label="발행"][value=[Filtered]]',
				attributes: { id: 'publish', class: 'primary', type: 'submit', 'aria-label': '발행' },
			},
		],
	});
	expect(JSON.stringify(summary)).not.toContain('token=private');
	expect(JSON.stringify(summary)).not.toContain('user-42');
});

it('외부 요청이 임의의 태그나 긴 breadcrumb를 추가하면 거절한다', () => {
	const summary = {
		eventId: EVENT_ID,
		title: 'Error',
		errorType: 'Error',
		route: '/write',
		tags: { secret: 'private' },
		breadcrumbs: [{ category: 'navigation' }],
	};
	expect(parseSentrySlackSummary(summary)).toBeNull();
	expect(parseSentrySlackSummary({ ...summary, tags: {}, breadcrumbs: [{ arbitrary: 'field' }] })).toBeNull();
	expect(
		parseSentrySlackSummary({
			...summary,
			tags: {},
			breadcrumbs: [{ category: 'ui.click', attributes: { title: 'user@example.com' } }],
		})?.breadcrumbs[0].attributes,
	).toEqual({ title: '[Email]' });
});

it('API URL은 경로를 남기고 쿼리와 임의 도메인 URL은 제거한다', () => {
	const summary = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		message: 'POST https://api.rilog.test/v1/posts/42?token=secret failed; source https://evil.example/path',
		breadcrumbs: [
			{
				category: 'fetch',
				message: 'POST https://api.rilog.test/v1/posts/42?token=secret',
				data: { method: 'POST', url: 'https://api.rilog.test/v1/posts/42?token=secret', status_code: 503 },
			},
		],
	});
	expect(summary?.title).toContain('https://api.rilog.test/v1/posts/42');
	expect(summary?.title).toContain('[URL]');
	expect(JSON.stringify(summary)).not.toContain('secret');
	expect(summary?.breadcrumbs[0]).toMatchObject({
		method: 'POST',
		url: 'https://api.rilog.test/v1/posts/42',
		statusCode: 503,
	});
});
