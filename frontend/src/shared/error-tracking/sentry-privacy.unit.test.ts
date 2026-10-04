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
