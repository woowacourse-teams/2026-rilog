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

		const options = initMock.mock.calls[0]?.[1] as {
			autocapture: boolean;
			capture_performance: boolean;
			enable_recording_console_log: boolean;
			capture_pageview: boolean;
			capture_pageleave: boolean;
			session_recording: Record<string, unknown>;
		};
		expect(initMock).toHaveBeenCalledWith('phc_test', options);
		expect(options).toMatchObject({
			autocapture: false,
			capture_performance: false,
			enable_recording_console_log: false,
			capture_pageview: true,
			capture_pageleave: true,
		});
		expect(options.session_recording).toMatchObject({
			recordHeaders: false,
			recordBody: false,
			streamNetworkBody: false,
			maskAllInputs: true,
			maskTextClass: 'ph-mask',
			blockClass: 'ph-no-capture',
			blockSelector: '[data-ph-sensitive-media] img',
		});
		expect(captureMock).toHaveBeenCalledWith('test event', { enabled: true });
	});

	it('세션 리플레이 마스킹 콜백은 민감한 값을 fail-closed로 처리한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const { initializeAnalytics } = await import('./posthog');

		initializeAnalytics();
		expect(initMock).toHaveBeenCalledOnce();
		const options = initMock.mock.calls[0]?.[1] as {
			session_recording: {
				maskInputFn: (value: string, element?: HTMLElement) => string;
				maskAttributeFn: (name: string, value: string, element?: Element) => string;
				maskCapturedNetworkRequestFn: (request: unknown) => Record<string, unknown>;
			};
		};

		const createInputElement = (config: {
			type?: string;
			sensitive?: boolean;
			insideSensitiveGroup?: boolean;
			masked?: boolean;
		}) =>
			({
				getAttribute: (name: string) => (name === 'type' ? (config.type ?? 'text') : null),
				hasAttribute: (name: string) => name === 'data-ph-sensitive-input' && config.sensitive === true,
				closest: (selector: string) => {
					if (selector === '[data-ph-sensitive-inputs]' && config.insideSensitiveGroup === true) {
						return {} as Element;
					}
					if (selector === '.ph-mask' && config.masked === true) {
						return {} as Element;
					}
					return null;
				},
				classList: { contains: (className: string) => className === 'ph-mask' && config.masked === true },
			}) as unknown as HTMLElement;

		expect(options.session_recording.maskInputFn('public profile', createInputElement({}))).toBe('public profile');
		expect(options.session_recording.maskInputFn('password', createInputElement({ type: 'password' }))).toBe(
			'[Masked]',
		);
		expect(options.session_recording.maskInputFn('email', createInputElement({ type: 'email' }))).toBe('[Masked]');
		expect(options.session_recording.maskInputFn('title', createInputElement({ sensitive: true }))).toBe('[Masked]');
		expect(options.session_recording.maskInputFn('nickname', createInputElement({ insideSensitiveGroup: true }))).toBe(
			'[Masked]',
		);
		expect(options.session_recording.maskInputFn('private', createInputElement({ masked: true }))).toBe('[Masked]');
		const createAttributeElement = (config: {
			masked?: boolean;
			sensitive?: boolean;
			ancestorMarker?: 'ph-mask' | 'data-ph-sensitive-media' | 'data-ph-sensitive-attribute';
		}) =>
			({
				classList: { contains: (className: string) => className === 'ph-mask' && config.masked === true },
				hasAttribute: (attributeName: string) =>
					attributeName === 'data-ph-sensitive-attribute' && config.sensitive === true,
				closest: (selector: string) => {
					if (config.ancestorMarker === undefined) {
						return null;
					}

					const markerSelector = config.ancestorMarker === 'ph-mask' ? '.ph-mask' : `[${config.ancestorMarker}]`;
					return selector.split(', ').includes(markerSelector) ? {} : null;
				},
			}) as unknown as Element;

		const maskedButton = createAttributeElement({ masked: true });
		expect(options.session_recording.maskAttributeFn('aria-label', 'secret', maskedButton)).toBe('[Masked]');
		expect(options.session_recording.maskAttributeFn('class', 'ph-mask', maskedButton)).toBe('ph-mask');
		expect(options.session_recording.maskAttributeFn('role', 'button', maskedButton)).toBe('button');

		const markedLink = createAttributeElement({ sensitive: true });
		for (const attributeName of ['value', 'aria-label', 'alt', 'title', 'href', 'src']) {
			expect(options.session_recording.maskAttributeFn(attributeName, 'sensitive value', markedLink)).toBe('[Masked]');
		}
		expect(options.session_recording.maskAttributeFn('data-ph-sensitive-attribute', '', markedLink)).toBe('');
		expect(options.session_recording.maskAttributeFn('class', 'link-class', markedLink)).toBe('link-class');
		expect(options.session_recording.maskAttributeFn('role', 'link', markedLink)).toBe('link');

		const publicLink = createAttributeElement({});
		expect(options.session_recording.maskAttributeFn('href', '/feeds?page=2', publicLink)).toBe('/feeds?page=2');

		const nestedAnchor = createAttributeElement({ ancestorMarker: 'ph-mask' });
		expect(options.session_recording.maskAttributeFn('href', 'https://private.example/post', nestedAnchor)).toBe(
			'[Masked]',
		);

		const nestedImage = createAttributeElement({ ancestorMarker: 'data-ph-sensitive-media' });
		expect(options.session_recording.maskAttributeFn('src', 'https://private.example/image.png', nestedImage)).toBe(
			'[Masked]',
		);
		expect(options.session_recording.maskAttributeFn('alt', 'private image', nestedImage)).toBe('[Masked]');

		const maskedRequest = options.session_recording.maskCapturedNetworkRequestFn({
			name: 'https://api.rilog.test/v1/users/me',
			requestHeaders: { authorization: 'secret' },
			responseHeaders: { 'set-cookie': 'secret' },
			requestBody: 'secret',
			responseBody: 'secret',
		});
		expect(maskedRequest.requestHeaders).toBeUndefined();
		expect(maskedRequest.responseHeaders).toBeUndefined();
		expect(maskedRequest.requestBody).toBeUndefined();
		expect(maskedRequest.responseBody).toBeUndefined();

		const throwingInput = () => {
			throw new Error('mask input failed');
		};
		const throwingAttribute = () => {
			throw new Error('mask attribute failed');
		};
		const throwingNetwork = () => {
			throw new Error('mask network failed');
		};
		expect(() =>
			options.session_recording.maskInputFn.call(null, throwingInput as unknown as string, null as never),
		).not.toThrow();
		expect(() =>
			options.session_recording.maskAttributeFn.call(null, 'aria-label', throwingAttribute as unknown as string),
		).not.toThrow();
		expect(() => options.session_recording.maskCapturedNetworkRequestFn.call(null, throwingNetwork)).not.toThrow();
	});

	it('before_send와 네트워크 콜백은 민감한 URL만 정제하고 공개 query와 hash를 보존한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'phc_test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		const { initializeAnalytics } = await import('./posthog');

		initializeAnalytics();
		const options = initMock.mock.calls[0]?.[1] as {
			before_send: (event: unknown) => { properties: Record<string, unknown> } | null;
			session_recording: { maskCapturedNetworkRequestFn: (request: unknown) => Record<string, unknown> };
		};
		const event = options.before_send({
			properties: {
				current_url:
					'https://rilog.kr/feeds?blogType=TECH&page=2&size=12&safe=kept&EMAIL=alice%40example.com&e-mail=other%40example.com&invite=invite-secret&INVITE=other-invite&error=oauth-error&ERROR=other-error&error-description=oauth-description&ERROR_DESCRIPTION=other-description&series=public-series&chapter=1&colog=team&category=TECH&tab=all#chapter-1',
				referrer: 'https://rilog.kr/write?draftId=42&postId=7&safe=kept&category=TECH#editor',
			},
		});
		if (event === null) {
			throw new Error('before_send unexpectedly dropped a valid event');
		}

		const currentUrl = new URL(String(event.properties.current_url));
		const referrer = new URL(String(event.properties.referrer));
		expect(currentUrl.searchParams.get('blogType')).toBe('TECH');
		expect(currentUrl.searchParams.get('page')).toBe('2');
		expect(currentUrl.searchParams.get('size')).toBe('12');
		expect(currentUrl.searchParams.get('safe')).toBe('kept');
		expect(currentUrl.searchParams.get('EMAIL')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('e-mail')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('invite')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('INVITE')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('error')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('ERROR')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('error-description')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('ERROR_DESCRIPTION')).toBe('[Masked]');
		expect(currentUrl.searchParams.get('series')).toBe('public-series');
		expect(currentUrl.searchParams.get('chapter')).toBe('1');
		expect(currentUrl.searchParams.get('colog')).toBe('team');
		expect(currentUrl.searchParams.get('category')).toBe('TECH');
		expect(currentUrl.searchParams.get('tab')).toBe('all');
		expect(currentUrl.hash).toBe('#chapter-1');
		expect(referrer.searchParams.get('draftId')).not.toBe('42');
		expect(referrer.searchParams.get('postId')).not.toBe('7');
		expect(referrer.searchParams.get('safe')).toBe('kept');
		expect(referrer.searchParams.get('category')).toBe('TECH');
		expect(referrer.hash).toBe('#editor');

		const callbackRequest = options.session_recording.maskCapturedNetworkRequestFn({
			name: '/auth/github/callback?code=oauth-secret&safe=kept#callback',
		});
		const callbackUrl = new URL(String(callbackRequest.name), 'https://rilog.kr');
		expect(callbackUrl.searchParams.get('code')).not.toBe('oauth-secret');
		expect(callbackUrl.searchParams.get('safe')).toBe('[Masked]');
		expect(callbackUrl.hash).toBe('#callback');

		const draftRequest = options.session_recording.maskCapturedNetworkRequestFn({
			name: '/v1/drafts/42?X-Amz-Signature=aws-secret&safe=kept&series=public-series#draft',
		});
		const draftUrl = new URL(String(draftRequest.name), 'https://rilog.kr');
		expect(draftUrl.pathname).not.toContain('42');
		expect(draftUrl.searchParams.get('X-Amz-Signature')).not.toBe('aws-secret');
		expect(draftUrl.searchParams.get('safe')).toBe('kept');
		expect(draftUrl.searchParams.get('series')).toBe('public-series');
		expect(draftUrl.hash).toBe('#draft');

		const malformedRequest = options.session_recording.maskCapturedNetworkRequestFn({ name: 'http://[malformed' });
		expect(malformedRequest.name).toBe('[Masked]');
		const malformedEvent = {
			get properties(): never {
				throw new Error('malformed event');
			},
		};
		expect(options.before_send(malformedEvent)).toBeNull();
		expect(() => options.before_send(null)).not.toThrow();
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
				category: 'TECH',
				cologId: 1,
				imageSource: 'default',
				blockCountBucket: '1-5',
			}),
		).not.toThrow();
	});
});
