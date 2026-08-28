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
});
