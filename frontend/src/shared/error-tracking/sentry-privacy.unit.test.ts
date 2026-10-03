import { describe, expect, it } from 'vitest';

import type { ErrorEvent } from '@sentry/nextjs';

import { sanitizeSentryError, sanitizeSentrySpan, sanitizeSentryTransaction, toSentryRoute } from './sentry-privacy';

const context = { environment: 'prod', release: 'rilog@123abc' };
const secret = 'PRIVATE_email_nickname_token_body_filename';

describe('오류 이벤트의 User-Agent 진단 정보', () => {
	it.each([
		['Mozilla/5.0 Chrome/154.0 Safari/537.36', 'browser', undefined],
		['Mozilla/5.0 Chrome/154.0 Googlebot/2.1', 'bot', 'Googlebot'],
		['bingbot/2.0', 'bot', 'bingbot'],
		['ExampleCrawler/1.0', 'bot', undefined],
		['Mozilla/5.0 HeadlessChrome/154.0', 'automation', undefined],
		['curl/8.0', 'unknown', undefined],
		['', 'unknown', undefined],
	])('%s를 보존하고 %s로 추정한다', (userAgent, clientType, botName) => {
		const sent = sanitizeSentryError({ type: undefined }, { ...context, userAgent });
		expect(sent.tags).toMatchObject({
			client_type: clientType,
			detection_source: userAgent ? 'user_agent' : 'unknown',
		});
		expect(sent.tags?.bot_name).toBe(botName);
		expect(sent.contexts?.client?.user_agent).toBe(userAgent || undefined);
		expect(sent.tags).not.toHaveProperty('user_agent');
	});

	it.each(['user-agent', 'User-Agent', 'USER-AGENT'])(
		'서버의 %s만 보존하고 다른 헤더와 임의 context는 제거한다',
		(header) => {
			const sent = sanitizeSentryError(
				{
					type: undefined,
					request: { headers: { [header]: 'Googlebot/2.1', Authorization: secret, Cookie: secret } },
					contexts: { private: { value: secret } },
				},
				context,
			);
			expect(sent.contexts).toEqual({ client: { user_agent: 'Googlebot/2.1' } });
			expect(sent.tags).toMatchObject({ client_type: 'bot', bot_name: 'Googlebot' });
			expect(sent.request).toBeUndefined();
			expect(JSON.stringify(sent)).not.toContain(secret);
		},
	);

	it('브라우저 UA가 있으면 서버 헤더보다 우선한다', () => {
		const sent = sanitizeSentryError(
			{ type: undefined, request: { headers: { 'User-Agent': 'Googlebot/2.1' } } },
			{ ...context, userAgent: 'Firefox/150.0' },
		);
		expect(sent.contexts?.client?.user_agent).toBe('Firefox/150.0');
		expect(sent.tags?.client_type).toBe('browser');
	});

	it('UA의 제어 문자를 제거하고 최대 1024자로 제한한다', () => {
		const sent = sanitizeSentryError(
			{ type: undefined },
			{ ...context, userAgent: `Chrome/154\r\n${'x'.repeat(2000)}` },
		);
		expect(String(sent.contexts?.client?.user_agent)).toHaveLength(1024);
		expect(String(sent.contexts?.client?.user_agent)).not.toMatch(/[\r\n]/);
	});
});

describe('Sentry 공통 개인정보 경계', () => {
	it.each([
		['/feeds?keyword=secret', '/feeds'],
		['/write?draftId=secret', '/write'],
		['https://rilog.test/alice/posts/42?token=secret#secret', '/[slug]/posts/[postId]'],
		['/alice/settings', '/[slug]/settings'],
		['/alice', '/[slug]'],
		['/alice/posts/42/markdown', '/[slug]/posts/[postId]/markdown'],
		['/auth/github/callback?code=secret&state=secret', '/auth/github/callback'],
		['GET /[slug]/posts/[postId]', '/[slug]/posts/[postId]'],
		['/unexpected/secret/path', 'unknown'],
	])('%s에서 동적 값이 없는 경로 %s만 기록한다', (url, expected) => {
		expect(toSentryRoute(url)).toBe(expected);
	});

	it('일반 오류의 모든 자유 입력을 제거하고 배포 스택 위치와 공통 태그를 보존한다', () => {
		const event: ErrorEvent = {
			type: undefined,
			message: secret,
			logentry: { message: secret, params: [secret] },
			request: {
				url: `https://rilog.test/${secret}/posts/${secret}?code=${secret}`,
				headers: {
					Authorization: secret,
					Cookie: secret,
					'Set-Cookie': secret,
					'User-Agent': 'Mozilla/5.0 Chrome/123',
				},
				data: secret,
			},
			user: { email: secret, username: secret },
			extra: { body: secret },
			contexts: { custom: { body: secret } },
			transaction: secret,
			server_name: secret,
			logger: secret,
			fingerprint: [secret],
			tags: { content: secret },
			breadcrumbs: [{ message: secret, data: { body: secret } }],
			exception: {
				values: [
					{
						type: 'TypeError',
						value: secret,
						stacktrace: {
							frames: [
								{
									filename: `https://rilog.test/_next/static/chunks/123abc.js?token=${secret}`,
									function: secret,
									vars: { body: secret },
									context_line: secret,
									lineno: 12,
									colno: 34,
								},
								{ filename: `https://s3.test/${secret}?signature=${secret}` },
							],
						},
					},
				],
			},
		};
		const sent = sanitizeSentryError(event, context);
		expect(JSON.stringify(sent)).not.toContain(secret);
		expect(sent.tags).toEqual({
			environment: 'prod',
			release: 'rilog@123abc',
			feature: 'content',
			operation: 'unhandled',
			route: '/[slug]/posts/[postId]',
			browser: 'Chrome/123',
			device: 'desktop',
			client_type: 'browser',
			detection_source: 'user_agent',
		});
		expect(sent.exception?.values?.[0].stacktrace?.frames).toEqual([
			{ filename: 'app:///_next/static/chunks/123abc.js', lineno: 12, colno: 34, in_app: undefined },
		]);
		expect(event.message).toBe(secret);
	});

	it('작업 문맥이 없는 API 오류도 일반 앱 오류와 구분한다', () => {
		const sent = sanitizeSentryError(
			{ type: undefined, exception: { values: [{ type: 'NormalizedApiError' }] } },
			context,
		);
		expect(sent.tags).toMatchObject({ feature: 'api', operation: 'unhandled' });
	});

	it('서버 배포 스택과 소스맵 ID를 같은 파일 경로로 보존한다', () => {
		const filename = '/srv/private/.next/server/chunks/ssr/123abc.js';
		const debugId = '11111111-2222-3333-4444-555555555555';
		const sent = sanitizeSentryError(
			{
				type: undefined,
				exception: { values: [{ type: 'Error', stacktrace: { frames: [{ filename, lineno: 2 }] } }] },
				debug_meta: { images: [{ type: 'sourcemap', code_file: filename, debug_id: debugId }] },
			},
			context,
		);
		expect(sent.exception?.values?.[0].stacktrace?.frames?.[0].filename).toBe(
			'app:///_next/server/chunks/ssr/123abc.js',
		);
		expect(sent.debug_meta?.images?.[0]).toEqual({
			type: 'sourcemap',
			code_file: 'app:///_next/server/chunks/ssr/123abc.js',
			debug_id: debugId,
		});
		expect(JSON.stringify(sent)).not.toContain('private');
	});

	it('메시지 원문을 보내지 않고 알 수 없는 API 코드도 고정된 이름으로 보고한다', () => {
		const sent = sanitizeSentryError(
			{
				type: undefined,
				message: secret,
				tags: { operation: 'post.publish', errorCode: secret, httpStatus: 'NO_RESPONSE', request_id: secret },
			},
			context,
		);
		expect(sent.tags).toMatchObject({ feature: 'writing', api_error_code: 'UNKNOWN_ERROR_CODE' });
		expect(sent.tags).not.toHaveProperty('httpStatus');
		expect(sent.tags).not.toHaveProperty('request_id');
		expect(JSON.stringify(sent)).not.toContain(secret);
	});

	it('공개 API 코드와 실제 HTTP 상태 및 UUID 요청 ID만 추가한다', () => {
		const requestId = '11111111-2222-3333-4444-555555555555';
		const sent = sanitizeSentryError(
			{
				type: undefined,
				tags: { operation: 'draft.save', errorCode: 'INTERNAL_SERVER_ERROR', httpStatus: '500', request_id: requestId },
				exception: { values: [{ type: 'NormalizedApiError', value: secret }] },
			},
			context,
		);
		expect(sent.tags).toMatchObject({
			api_error_code: 'INTERNAL_SERVER_ERROR',
			httpStatus: '500',
			request_id: requestId,
		});
		expect(sent.exception?.values?.[0].value).toBe('[writing] draft.save failed: INTERNAL_SERVER_ERROR (500)');
		expect(sent.tags).not.toHaveProperty('errorCode');
	});

	it('트랜잭션과 자식 span의 URL·data·links를 제거하고 경로를 정규화한다', () => {
		const span = {
			span_id: '1111111111111111',
			trace_id: '22222222222222222222222222222222',
			start_timestamp: 1,
			timestamp: 2,
			description: `/alice/posts/42?secret=${secret}`,
			op: 'http.client',
			data: { body: secret },
			links: [{ trace_id: secret, span_id: secret }],
		};
		const sent = sanitizeSentryTransaction(
			{
				type: 'transaction',
				transaction: `/alice/posts/42?secret=${secret}`,
				spans: [span],
				contexts: { trace: { trace_id: span.trace_id, span_id: span.span_id, data: { body: secret } } },
				extra: { body: secret },
			},
			context,
		);
		expect(sent.transaction).toBe('/[slug]/posts/[postId]');
		expect(sent.spans?.[0].description).toBe('/[slug]/posts/[postId]');
		expect(JSON.stringify(sent)).not.toContain(secret);
		expect(sanitizeSentrySpan(span).data).toEqual({});
	});
});
