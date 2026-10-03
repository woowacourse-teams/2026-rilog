import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as Sentry from '@sentry/nextjs';

import { createApiFailure } from '@/test/fixtures/api-error';

const { initMock, initializeAnalyticsMock } = vi.hoisted(() => ({
	initMock: vi.fn<typeof Sentry.init>(),
	initializeAnalyticsMock: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
	init: initMock,
	getClient: () => ({ getOptions: () => ({ release: 'test-release' }) }),
	captureRouterTransitionStart: vi.fn(),
}));

vi.mock('@/shared/analytics/posthog', () => ({
	initializeAnalytics: initializeAnalyticsMock,
}));

const configurations = [
	{ name: 'client', load: () => import('@/../instrumentation-client') },
	{ name: 'server', load: () => import('@/../sentry.server.config') },
	{ name: 'edge', load: () => import('@/../sentry.edge.config') },
];

beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe.each(configurations)('$name Sentry 초기화', ({ name, load }) => {
	it.each(['development', 'production'])('%s에서 공통 설정과 런타임별 샘플링을 유지한다', async (environment) => {
		vi.stubEnv('NODE_ENV', environment);
		vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
		vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'false');
		await load();
		expect(initMock).toHaveBeenCalledOnce();
		expect(initMock.mock.calls[0]?.[0]).toMatchObject({
			dsn: 'https://public@example.invalid/1',
			enabled: environment === 'production',
			environment: environment === 'production' ? 'prod' : 'local',
			sendDefaultPii: false,
		});
		expect(initMock.mock.calls[0]?.[0].tracesSampleRate).toBe(name === 'client' ? undefined : 1);
	});
	it('개발 환경에서 명시적으로 수집을 활성화할 수 있다', async () => {
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
		await load();
		expect(initMock.mock.calls[0]?.[0].enabled).toBe(true);
	});
	it('API 오류의 최종 전송 필터를 등록한다', async () => {
		await load();
		const [options] = initMock.mock.calls[0] as [
			{
				beforeSend: (event: { message: string }, hint: { originalException: unknown }) => unknown;
			},
		];
		const event = { message: 'failure' };
		expect(options.beforeSend(event, { originalException: await createApiFailure('POST_NOT_FOUND', 404) })).toBeNull();
		expect(options.beforeSend(event, { originalException: new Error('unexpected') })).toMatchObject({
			message: 'failure',
			tags: { release: 'test-release', route: 'unknown', operation: 'unhandled' },
		});
	});
	it('필터에서 예외가 발생하면 원문 전송과 앱 오류 전파를 막는다', async () => {
		await load();
		const beforeSend = initMock.mock.calls[0]?.[0].beforeSend;
		const event: Sentry.ErrorEvent = {
			type: undefined,
			get request(): Sentry.ErrorEvent['request'] {
				throw new Error('private');
			},
		};
		expect(beforeSend?.(event, {})).toBeNull();
	});
	it('API 변환 이후에도 런타임에서 얻은 UA만 최종 context에 남긴다', async () => {
		const userAgent = name === 'client' ? 'Chrome/154.0' : 'Googlebot/2.1';
		if (name === 'client') {
			vi.stubGlobal('window', { location: { pathname: '/feeds' }, navigator: { userAgent } });
		}
		await load();
		const sent = await initMock.mock.calls[0]?.[0].beforeSend?.(
			{ type: undefined, request: { headers: { 'User-Agent': 'Googlebot/2.1', Cookie: 'PRIVATE_COOKIE' } } },
			{ originalException: await createApiFailure('INTERNAL_SERVER_ERROR', 500) },
		);
		expect(sent?.contexts?.client?.user_agent).toBe(userAgent);
		expect(sent?.tags?.client_type).toBe(name === 'client' ? 'browser' : 'bot');
		expect(sent?.request).toBeUndefined();
		expect(JSON.stringify(sent)).not.toContain('PRIVATE_COOKIE');
	});
	it('트랜잭션도 경로를 익명화하고 첨부파일을 제거한다', async () => {
		await load();
		const beforeSend = initMock.mock.calls[0]?.[0].beforeSendTransaction;
		const hint = { attachments: [{ filename: 'private.txt', data: 'private' }] };
		const sent = await beforeSend?.(
			{ type: 'transaction', transaction: '/private/posts/42?token=private', extra: { body: 'private' } },
			hint,
		);
		expect(sent?.transaction).toBe('/[slug]/posts/[postId]');
		expect(JSON.stringify(sent)).not.toContain('private');
		expect(hint.attachments).toEqual([]);
	});
	it.each(['development', 'production'])('%s에서 SDK 초기화 실패가 전파되지 않는다', async (environment) => {
		vi.stubEnv('NODE_ENV', environment);
		initMock.mockImplementation(() => {
			throw new Error('SDK initialization failed');
		});

		await expect(load()).resolves.toBeDefined();
		expect(initMock).toHaveBeenCalledOnce();
		if (environment === 'production') {
			expect(console.warn).not.toHaveBeenCalled();
		} else {
			expect(console.warn).toHaveBeenCalled();
		}
	});
});

it('Sentry 초기화에 실패해도 다음 분석 초기화를 실행한다', async () => {
	initMock.mockImplementation(() => {
		throw new Error('SDK initialization failed');
	});

	await import('@/../instrumentation-client');

	expect(initializeAnalyticsMock).toHaveBeenCalledOnce();
});
