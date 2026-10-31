import { expect, it } from 'vitest';

import { filterSentryEvent, filterSentrySpan } from './sentry-privacy';

it('SDK 오류 정보와 진단 맥락을 유지하면서 자격 증명과 요청 본문을 제거한다', () => {
	const event = {
		type: undefined,
		release: '572ccedd23c5382add2e8bd658def90b297ddeab',
		debug_meta: {
			images: [
				{
					type: 'sourcemap',
					code_file: 'https://www.rilog.kr/_next/static/chunks/app.js',
					debug_id: '11111111-1111-4111-8111-111111111111',
				},
			],
		},
		exception: {
			values: [
				{
					type: 'TypeError',
					value: 'Fetch failed',
					stacktrace: {
						frames: [
							{ filename: 'app.js', abs_path: 'https://www.rilog.kr/_next/static/chunks/app.js', lineno: 3, colno: 4 },
						],
					},
				},
			],
		},
		request: {
			url: 'https://api.rilog.test/v1/posts/42?code=oauth-secret&page=2',
			headers: { Authorization: 'Bearer secret', Cookie: 'session=secret', 'User-Agent': 'TestBrowser/1' },
			data: { content: 'private post' },
		},
		contexts: { api_request: { method: 'GET', url: 'https://api.rilog.test/v1/posts/42?page=2' } },
		user: { id: '42', email: 'person@example.com' },
	} as Parameters<typeof filterSentryEvent>[0];

	const sent = filterSentryEvent(event);
	expect(sent.exception?.values?.[0]?.stacktrace?.frames?.[0]).toMatchObject({
		filename: 'app.js',
		abs_path: 'https://www.rilog.kr/_next/static/chunks/app.js',
		lineno: 3,
		colno: 4,
	});
	expect(sent.debug_meta?.images?.[0]).toMatchObject({ debug_id: '11111111-1111-4111-8111-111111111111' });
	expect(sent.release).toBe('572ccedd23c5382add2e8bd658def90b297ddeab');
	expect(sent.contexts?.api_request).toMatchObject({ method: 'GET', url: 'https://api.rilog.test/v1/posts/42?page=2' });
	expect(sent.request?.url).toContain('page=2');
	expect(sent.user).toEqual({ id: '42' });
	expect(JSON.stringify(sent)).not.toMatch(/oauth-secret|Bearer secret|session=secret|private post|person@example.com/);
});

it('별도 query_string의 민감한 값을 URL과 같은 기준으로 가리고 공개 검색 조건은 보존한다', () => {
	const event = {
		exception: { values: [{ type: 'Error', value: 'Request failed' }] },
		request: {
			url: 'https://api.rilog.test/v1/search?email=person%40example.com&page=2',
			query_string: 'email=person%40example.com&nickname=private-nickname&content=private-content&page=2',
		},
	} as Parameters<typeof filterSentryEvent>[0];

	const sent = filterSentryEvent(event);
	const queryString = sent.request?.query_string;
	if (typeof queryString !== 'string') throw new Error('Expected the query string to remain serialized');
	const query = new URLSearchParams(queryString);
	expect(query.has('email')).toBe(false);
	expect(query.has('nickname')).toBe(false);
	expect(query.has('content')).toBe(false);
	expect(query.get('page')).toBe('2');
	expect(sent.request?.url).not.toContain('person%40example.com');
	expect(JSON.stringify(sent)).not.toMatch(/person%40example\.com|private-nickname|private-content/);
});

it('Sentry query_string의 객체와 key-value tuple 형식도 민감 키를 가린다', () => {
	const objectEvent = {
		type: undefined,
		exception: { values: [{ type: 'Error', value: 'Request failed' }] },
		request: {
			url: 'https://api.rilog.test/v1/search',
			query_string: { email: 'person@example.com', page: '2' },
		},
	} as Parameters<typeof filterSentryEvent>[0];
	const tupleEvent = {
		type: undefined,
		exception: { values: [{ type: 'Error', value: 'Request failed' }] },
		request: {
			url: 'https://api.rilog.test/v1/search',
			query_string: [
				['email', 'person@example.com'],
				['page', '2'],
			],
		},
	} as Parameters<typeof filterSentryEvent>[0];

	expect(filterSentryEvent(objectEvent).request?.query_string).toEqual({ page: '2' });
	expect(filterSentryEvent(tupleEvent).request?.query_string).toEqual([['page', '2']]);
});

it.each([
	{ headers: { 'Sentry-Hook-Signature': 'fixture-webhook-signature', 'User-Agent': 'fixture-browser' } },
	{
		headers: [
			['Sentry-Hook-Signature', 'fixture-webhook-signature'],
			['Cookie', 'fixture-session'],
			['User-Agent', 'fixture-browser'],
		],
	},
])('webhook 인증 서명은 SDK request header의 객체와 tuple 표현 모두에서 제거한다', ({ headers }) => {
	const event = { type: undefined, request: { headers } } as Parameters<typeof filterSentryEvent>[0];
	const sent = JSON.stringify(filterSentryEvent(event));
	expect(sent).not.toContain('fixture-webhook-signature');
	expect(sent).not.toContain('fixture-session');
	expect(sent).not.toContain('fixture-browser');
});

it('알 수 없는 query·상대 URL·fragment·UI 속성은 제거하고 SDK 스택은 보존한다', () => {
	const event = {
		type: undefined,
		request: {
			url: 'https://api.rilog.kr/v1/blogs/private-slug/posts/42?custom=private-query&page=2#private-fragment',
		},
		contexts: {
			api_request: { method: 'GET', url: '/feeds?custom=private-relative#private-hash' },
			upload: { filename: 'private-file.png' },
		},
		breadcrumbs: [
			{
				category: 'ui.click',
				message:
					'button#private-id.private-class[aria-label="private-label"][title="private-title"][data-secret="private-data"][type="submit"]',
				data: { value: 'private-input' },
			},
			{
				category: 'navigation',
				data: { from: '/feeds?custom=private-from', to: '/@private-slug/posts/42#private-to' },
			},
		],
		exception: {
			values: [
				{
					type: 'Error',
					value: 'Request failed',
					stacktrace: {
						frames: [{ filename: 'app.js', abs_path: 'https://www.rilog.kr/_next/static/chunks/app.js', lineno: 3 }],
					},
				},
			],
		},
	} as Parameters<typeof filterSentryEvent>[0];
	const sent = filterSentryEvent(event);
	expect(JSON.stringify(sent)).not.toContain('private-');
	expect(sent.request?.url).toContain('page=2');
	expect(sent.breadcrumbs?.[0]?.message).toBe('button[type="submit"]');
	expect(sent.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename).toBe('app.js');
});

it('성능 span과 transaction도 동일한 URL·header 기준을 적용한다', () => {
	const span = filterSentrySpan({
		span_id: '1234567890abcdef',
		trace_id: '0123456789abcdef0123456789abcdef',
		start_timestamp: 1,
		description: 'GET /feeds?unknown=private-query#private-hash',
		data: {
			'http.url': 'https://api.rilog.kr/v1/posts/42?custom=private-value&page=2',
			'http.request.headers': ['Cookie', 'private-cookie'],
			filename: 'private-file.png',
		},
	});
	expect(JSON.stringify(span)).not.toContain('private-');
	expect(span.data?.['http.url']).toBe('https://api.rilog.kr/v1/posts/42?page=2');
	const transaction = filterSentryEvent({
		type: 'transaction',
		transaction: '/@private-slug/posts/42',
		request: { query_string: 'custom=private-query&page=2' },
		user: { id: '42', ip_address: '192.0.2.1', geo: { city: 'private-city' } },
	});
	expect(JSON.stringify(transaction)).not.toContain('private-');
	expect(transaction.user).toEqual({ id: '42' });
});
