import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { initMock, initializeAnalyticsMock } = vi.hoisted(() => ({
	initMock: vi.fn(),
	initializeAnalyticsMock: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
	init: initMock,
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
});

describe.each(configurations)('$name Sentry 초기화', ({ load }) => {
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
