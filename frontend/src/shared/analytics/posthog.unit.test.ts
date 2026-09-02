import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captureMock, identifyMock, initMock, resetMock } = vi.hoisted(() => ({
	captureMock: vi.fn(),
	identifyMock: vi.fn(),
	initMock: vi.fn(),
	resetMock: vi.fn(),
}));

vi.mock('posthog-js', () => ({
	default: {
		capture: captureMock,
		identify: identifyMock,
		init: initMock,
		reset: resetMock,
	},
}));

describe('PostHog analytics', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	it('설정이 없으면 초기화와 이벤트 전송을 건너뛴다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
		const { captureAnalyticsEvent, identifyAnalyticsUser, initializeAnalytics, resetAnalyticsIdentity } =
			await import('./posthog');

		initializeAnalytics();
		captureAnalyticsEvent('test event');
		identifyAnalyticsUser('1', { slug: 'rilog', nickname: '리로그' });
		resetAnalyticsIdentity();

		expect(initMock).not.toHaveBeenCalled();
		expect(captureMock).not.toHaveBeenCalled();
		expect(identifyMock).not.toHaveBeenCalled();
		expect(resetMock).not.toHaveBeenCalled();
	});

	it('명시한 분석 설정으로 초기화하고 허용된 이벤트만 전송한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const { captureAnalyticsEvent, initializeAnalytics } = await import('./posthog');

		initializeAnalytics();
		captureAnalyticsEvent('test event', { enabled: true });

		expect(initMock).toHaveBeenCalledWith(
			'phc_test',
			expect.objectContaining({
				autocapture: false,
				disable_session_recording: true,
				capture_pageview: true,
				capture_pageleave: true,
			}),
		);
		expect(captureMock).toHaveBeenCalledWith('test event', { enabled: true });
	});

	it('설정된 환경에서는 사용자 식별과 로그아웃 초기화를 수행한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const { identifyAnalyticsUser, initializeAnalytics, resetAnalyticsIdentity } = await import('./posthog');

		initializeAnalytics();
		identifyAnalyticsUser('1', { slug: 'rilog', nickname: '리로그' });
		resetAnalyticsIdentity();

		expect(identifyMock).toHaveBeenCalledWith('1', { slug: 'rilog', nickname: '리로그' });
		expect(resetMock).toHaveBeenCalledOnce();
	});

	it.each([
		['init', initMock, 'initializeAnalytics'],
		['capture', captureMock, 'captureAnalyticsEvent'],
		['identify', identifyMock, 'identifyAnalyticsUser'],
		['reset', resetMock, 'resetAnalyticsIdentity'],
	] as const)('%s SDK 오류를 호출자에게 전파하지 않는다', async (_operation, sdkMock, publicFunction) => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		sdkMock.mockImplementationOnce(() => {
			throw new Error('sdk failed');
		});
		const analyticsModule = await import('./posthog');
		const invoke = {
			initializeAnalytics: () => analyticsModule.initializeAnalytics(),
			captureAnalyticsEvent: () => analyticsModule.captureAnalyticsEvent('test event'),
			identifyAnalyticsUser: () => analyticsModule.identifyAnalyticsUser('1', { slug: 'rilog', nickname: '리로그' }),
			resetAnalyticsIdentity: () => analyticsModule.resetAnalyticsIdentity(),
		}[publicFunction];

		expect(invoke).not.toThrow();
	});

	it('초기화 실패 이후 SDK를 다시 호출하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		initMock.mockImplementationOnce(() => {
			throw new Error('init failed');
		});
		const { captureAnalyticsEvent, identifyAnalyticsUser, initializeAnalytics, resetAnalyticsIdentity } =
			await import('./posthog');

		initializeAnalytics();
		initializeAnalytics();
		captureAnalyticsEvent('test event');
		identifyAnalyticsUser('1', { slug: 'rilog', nickname: '리로그' });
		resetAnalyticsIdentity();

		expect(initMock).toHaveBeenCalledOnce();
		expect(captureMock).not.toHaveBeenCalled();
		expect(identifyMock).not.toHaveBeenCalled();
		expect(resetMock).not.toHaveBeenCalled();
	});

	it('개별 이벤트 실패 후 다음 이벤트를 다시 시도한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		captureMock.mockImplementationOnce(() => {
			throw new Error('capture failed');
		});
		const { captureAnalyticsEvent } = await import('./posthog');

		captureAnalyticsEvent('first event');
		captureAnalyticsEvent('second event');

		expect(captureMock).toHaveBeenCalledTimes(2);
	});

	it('개발 환경의 SDK 오류에는 operation 이름만 경고한다', async () => {
		vi.stubEnv('NODE_ENV', 'development');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		captureMock.mockImplementationOnce(() => {
			throw new Error('capture failed with sensitive payload');
		});
		const { captureAnalyticsEvent } = await import('./posthog');

		captureAnalyticsEvent('private event', { token: 'secret' });

		expect(warn).toHaveBeenCalledWith('[PostHog] capture 실패');
	});

	it('운영 환경의 SDK 오류는 경고하지 않는다', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		captureMock.mockImplementationOnce(() => {
			throw new Error('capture failed');
		});
		const { captureAnalyticsEvent } = await import('./posthog');

		captureAnalyticsEvent('test event');

		expect(warn).not.toHaveBeenCalled();
	});

	it('feature analytics 이벤트도 SDK 오류를 서비스 흐름으로 전파하지 않는다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		captureMock.mockImplementationOnce(() => {
			throw new Error('capture failed');
		});
		const { analytics } = await import('@/features/analytics/model/events');

		expect(() =>
			analytics.postPublished({
				postId: '42',
				ownerType: 'COLOG',
				category: 'IT',
				cologId: 1,
				imageSource: 'default',
				blockCountBucket: '1-5',
			}),
		).not.toThrow();
	});
});
