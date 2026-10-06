import { expect, it } from 'vitest';

import { filterSentryEvent } from './sentry-privacy';

it('SDK 오류 정보와 진단 맥락을 유지하면서 자격 증명과 요청 본문을 제거한다', () => {
	const event = {
		type: undefined,
		exception: {
			values: [
				{ type: 'TypeError', value: 'Fetch failed', stacktrace: { frames: [{ filename: 'app.js', lineno: 3 }] } },
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
	expect(sent.exception?.values?.[0]?.stacktrace?.frames?.[0]).toMatchObject({ filename: 'app.js', lineno: 3 });
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
	expect(query.get('email')).toBe('[Filtered]');
	expect(query.get('nickname')).toBe('[Filtered]');
	expect(query.get('content')).toBe('[Filtered]');
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

	expect(filterSentryEvent(objectEvent).request?.query_string).toEqual({ email: '[Filtered]', page: '2' });
	expect(filterSentryEvent(tupleEvent).request?.query_string).toEqual([
		['email', '[Filtered]'],
		['page', '2'],
	]);
});
