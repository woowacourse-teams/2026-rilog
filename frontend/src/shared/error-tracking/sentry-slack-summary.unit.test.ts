import { expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/nextjs';

import { summarizeSentryEventForSlack } from './sentry-slack-summary';

const EVENT_ID = '0123456789abcdef0123456789abcdef';

it('webhook 이벤트에서 제목과 허용한 태그, 최근 자동 breadcrumb만 Slack 요약에 담는다', () => {
	const event = {
		type: undefined,
		event_id: EVENT_ID,
		message: 'POST failed at https://api.rilog.kr/v1/posts?token=private',
		request: { url: 'https://www.rilog.kr/write?draft=private' },
		release: '572ccedd',
		environment: 'prod',
		exception: { values: [{ type: 'TypeError' }] },
		tags: {
			operation: 'post.publish',
			http_status: '503',
			request_id: 'do-not-send',
			secret: 'private',
			'PostHog Recording URL':
				'https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
		},
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
				selector: 'button[type="submit"]',
				attributes: { type: 'submit' },
			},
		],
		sessionReplayUrl: 'https://us.posthog.com/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
	});
	expect(JSON.stringify(summary)).not.toContain('token=private');
	expect(JSON.stringify(summary)).not.toContain('user-42');
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

it('navigation의 상대 URL은 Slack 요약에서 민감한 쿼리를 제거한다', () => {
	const relativeUrl = '/feeds?email=person%40example.com&nickname=private-nickname&content=private-content';
	const summarized = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		breadcrumbs: [{ category: 'navigation', data: { from: relativeUrl, to: relativeUrl } }],
	});
	expect(summarized?.breadcrumbs[0]).toEqual({ category: 'navigation', from: '/feeds', to: '/feeds' });

	expect(JSON.stringify(summarized)).not.toMatch(/person|private/);
});

it('클라이언트 오류에 transaction이 없어도 request URL을 식별자 없는 route로 정규화한다', () => {
	const summarized = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		request: { url: 'https://www.rilog.kr/@private-blog/posts/72?email=person%40example.com' },
	});
	expect(summarized?.route).toBe('/blog/[slug]/posts/[postId]');
	expect(JSON.stringify(summarized)).not.toMatch(/private-blog|person|72/);
});

it('허용되지 않은 PostHog replay URL은 Slack 요약에서 제외한다', () => {
	const summarized = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		tags: {
			'PostHog Recording URL': 'https://evil.example/project/phc_test/replay/01234567-89ab-cdef-0123-456789abcdef?t=30',
		},
	});
	expect(summarized?.sessionReplayUrl).toBeUndefined();
});

it('원인 요청은 최근 breadcrumb에서 밀려나도 쿼리 없이 별도 보존한다', () => {
	const summary = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		tags: {
			http_status: '500',
			request_id: '671a5cb0-bfc5-4cab-b9bf-42044df2b76d',
			error_kind: 'server_response',
			user_impact: 'load_failed',
		},
		contexts: {
			api_request: {
				method: 'POST',
				url: 'https://api.rilog.kr/v1/posts/295/views?custom=private#secret',
				headers: { cookie: 'private' },
			},
		},
		breadcrumbs: Array.from({ length: 5 }, () => ({ category: 'ui.click', message: 'button' })),
	});
	expect(summary?.apiRequest).toEqual({
		method: 'POST',
		url: 'https://api.rilog.kr/v1/posts/[id]/views',
		statusCode: 500,
		requestId: '671a5cb0-bfc5-4cab-b9bf-42044df2b76d',
	});
	expect(summary?.tags).toMatchObject({ error_kind: 'server_response', user_impact: 'load_failed' });
	expect(JSON.stringify(summary)).not.toMatch(/private|cookie|secret|295/);
});

it('외부 저장소의 presigned URL과 임의 request ID는 새 원인 요청 필드로 보내지 않는다', () => {
	const summary = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		tags: { request_id: 'person@example.com' },
		contexts: { api_request: { method: 'PUT', url: 'https://storage.example/private-key?signature=private' } },
	});
	expect(summary?.apiRequest).toEqual({ method: 'PUT' });
	expect(JSON.stringify(summary)).not.toMatch(/storage.example|private|person/);
});

it('Slack 요약은 임의 URL 값과 UI 작성 속성을 다시 제거한다', () => {
	const summary = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		breadcrumbs: [
			{
				category: 'navigation',
				data: { from: '/feeds?custom=private-query&page=2#private-hash', to: '/@private-slug/posts/42' },
			},
			{
				category: 'ui.click',
				message: 'button#private-id.private-class[title="private-title"][aria-label="private-label"][type="submit"]',
			},
		],
	});
	expect(JSON.stringify(summary)).not.toContain('private-');
	expect(summary?.breadcrumbs[0]).toMatchObject({ from: '/feeds?page=2', to: '/blog/[slug]/posts/[postId]' });
});

it.each([
	'https://user:private-pass@us.posthog.com/project/123/replay/01234567-89ab-cdef-0123-456789abcdef',
	'https://us.posthog.com:444/project/123/replay/01234567-89ab-cdef-0123-456789abcdef',
	'https://us.posthog.com/project/123/replay/private%40email.com',
	'https://us.posthog.com/project/123/replay/01234567-89ab-cdef-0123-456789abcdef#private-hash',
])('replay URL의 인증값·비표준 포트·임의 식별자·fragment는 거절한다: %s', (value) => {
	const summary = summarizeSentryEventForSlack({
		type: undefined,
		event_id: EVENT_ID,
		tags: { 'PostHog Recording URL': value },
	});
	expect(summary?.sessionReplayUrl).toBeUndefined();
});

it.each([
	{ transaction: 'GET /blog/[slug]/posts/[postId]' },
	{ contexts: { nextjs: { request_path: '/blog/[slug]/posts/[postId]' } } },
	{ transaction: 'GET /unrecognized', contexts: { nextjs: { request_path: '/@private-slug/posts/42?token=secret' } } },
])('서버 경로 fallback은 개인정보 없이 정규화한다: %j', (fields) => {
	const summary = summarizeSentryEventForSlack({ type: undefined, event_id: EVENT_ID, ...fields });
	expect(summary?.route).toBe('/blog/[slug]/posts/[postId]');
	expect(JSON.stringify(summary)).not.toContain('private-slug');
	expect(JSON.stringify(summary)).not.toContain('secret');
});
