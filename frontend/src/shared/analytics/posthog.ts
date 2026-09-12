import posthog from 'posthog-js';

import type { CapturedNetworkRequest, CaptureResult } from 'posthog-js';

type PostHogOperation = 'init' | 'capture' | 'identify' | 'reset';

const MASKED_VALUE = '[Masked]';
const SENSITIVE_QUERY_KEYS = new Set(['email', 'invite', 'error', 'errordescription']);
const SENSITIVE_QUERY_KEY_PATTERN =
	/(?:^|[_-])(?:auth|authorization|access|refresh|id)?token(?:$|[_-])|(?:^|[_-])(?:auth|authorization|code|state|nonce|secret|signature|credential|password|passwd)(?:$|[_-])|(?:^|[_-])api[_-]?key(?:$|[_-])|^x-amz(?:-|$)/i;
const SENSITIVE_ATTRIBUTE_NAMES = new Set(['value', 'aria-label', 'alt', 'title', 'href', 'src']);
const SENSITIVE_ATTRIBUTE_MARKER_SELECTOR = '.ph-mask, [data-ph-sensitive-media], [data-ph-sensitive-attribute]';
const OAUTH_CALLBACK_PATH_PATTERN =
	/(?:oauth\d?|auth)(?:\/[^/]+)*\/(?:callback|redirect)(?:\/|$)|\/callback(?:\/|$)|\/login\/oauth2\/code(?:\/|$)/i;
const DRAFT_API_PATH_PATTERN = /(\/v\d+\/drafts\/)([^/?#]+)/gi;
const WRITE_ROUTE_PATH_PATTERN = /^\/write(?:\/|$)/i;

const isAbsoluteUrl = (value: string) => /^[a-z][a-z\d+.-]*:/i.test(value);

const normalizeQueryKey = (key: string) => key.replace(/[-_]/g, '').toLowerCase();

const maskUrlQuery = (url: URL) => {
	const isOAuthCallback = OAUTH_CALLBACK_PATH_PATTERN.test(url.pathname);
	const isWriteRoute = WRITE_ROUTE_PATH_PATTERN.test(url.pathname);
	const searchParams = new URLSearchParams(url.search);

	for (const [key] of searchParams.entries()) {
		const shouldMask =
			isOAuthCallback ||
			SENSITIVE_QUERY_KEYS.has(normalizeQueryKey(key)) ||
			SENSITIVE_QUERY_KEY_PATTERN.test(key) ||
			(isWriteRoute && /^(?:draftId|postId)$/i.test(key));
		if (shouldMask) {
			searchParams.set(key, MASKED_VALUE);
		}
	}

	url.search = searchParams.toString();
};

const maskDraftApiPathId = (pathname: string) =>
	pathname.replace(DRAFT_API_PATH_PATTERN, (match, prefix: string, segment: string) => {
		if (segment.toLowerCase() === 'me' || segment.toLowerCase() === 'publish') {
			return match;
		}

		return `${prefix}${MASKED_VALUE}`;
	});

/**
 * URL fields can contain OAuth credentials, access tokens, signed object-store URLs,
 * or write identifiers. Public navigation filters, safe query values, and hash
 * fragments remain usable for product analytics.
 */
const sanitizeAnalyticsUrl = (value: string): string => {
	try {
		if (typeof value !== 'string') {
			return MASKED_VALUE;
		}

		const url = new URL(value, 'https://rilog.kr');
		url.pathname = maskDraftApiPathId(url.pathname);
		maskUrlQuery(url);

		if (isAbsoluteUrl(value)) {
			return url.toString();
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return MASKED_VALUE;
	}
};

const maskAttribute = (name: string, value: string, element?: Element) => {
	try {
		const normalizedName = name.toLowerCase();
		const isSensitiveAttribute = SENSITIVE_ATTRIBUTE_NAMES.has(normalizedName);
		const shouldMask =
			isSensitiveAttribute &&
			(element?.classList.contains('ph-mask') ||
				element?.hasAttribute('data-ph-sensitive-attribute') ||
				element?.closest(SENSITIVE_ATTRIBUTE_MARKER_SELECTOR) !== null);

		return shouldMask ? MASKED_VALUE : value;
	} catch {
		return MASKED_VALUE;
	}
};

const maskCapturedNetworkRequest = (request: CapturedNetworkRequest): CapturedNetworkRequest => {
	try {
		return {
			...request,
			name: sanitizeAnalyticsUrl(request.name),
			requestHeaders: undefined,
			responseHeaders: undefined,
			requestBody: undefined,
			responseBody: undefined,
		};
	} catch {
		return {
			name: MASKED_VALUE,
			requestHeaders: undefined,
			responseHeaders: undefined,
			requestBody: undefined,
			responseBody: undefined,
		} as CapturedNetworkRequest;
	}
};

const sanitizeBeforeSend = (event: CaptureResult | null): CaptureResult | null => {
	if (event === null) {
		return null;
	}

	try {
		if (event.properties === null || typeof event.properties !== 'object') {
			return null;
		}

		const properties = { ...event.properties };
		for (const key of Object.keys(properties)) {
			if (/^(?:\$?current_url|\$?referrer)$/i.test(key) && typeof properties[key] === 'string') {
				properties[key] = sanitizeAnalyticsUrl(properties[key]);
			}
		}

		return { ...event, properties };
	} catch {
		// Dropping an event is the safest fallback when its shape cannot be read.
		return null;
	}
};

let isAnalyticsDisabled = false;

const isAnalyticsConfigured = () =>
	Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

const warnPostHogFailure = (operation: PostHogOperation) => {
	if (process.env.NODE_ENV === 'development') {
		console.warn(`[PostHog] ${operation} 실패`);
	}
};

const runPostHogOperation = (operation: PostHogOperation, callback: () => void, disableOnFailure = false) => {
	if (isAnalyticsDisabled) {
		return;
	}

	try {
		callback();
	} catch {
		if (disableOnFailure) {
			isAnalyticsDisabled = true;
		}

		warnPostHogFailure(operation);
	}
};

export const initializeAnalytics = () => {
	const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

	if (!isAnalyticsConfigured() || !projectToken || !host) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[PostHog] 프로젝트 token 또는 host가 없어 분석 이벤트를 전송하지 않습니다.');
		}

		return;
	}

	runPostHogOperation(
		'init',
		() =>
			posthog.init(projectToken, {
				api_host: host,
				defaults: '2026-08-29',
				autocapture: false,
				capture_performance: false,
				enable_recording_console_log: false,
				capture_pageview: true,
				capture_pageleave: true,
				session_recording: {
					recordHeaders: false,
					recordBody: false,
					streamNetworkBody: false,
					maskAllInputs: true,
					maskTextClass: 'ph-mask',
					blockClass: 'ph-no-capture',
					blockSelector: '[data-ph-sensitive-media] img',
					maskAttributeFn: (name, value, element) => maskAttribute(name, value, element),
					maskCapturedNetworkRequestFn: (request) => maskCapturedNetworkRequest(request),
				},
				before_send: (event) => sanitizeBeforeSend(event),
				debug: process.env.NODE_ENV === 'development',
			}),
		true,
	);
};

/**
 * 분석 환경이 설정된 경우에만 사용자 행동 이벤트를 전송
 * 이벤트 이름과 payload 구성은 features/analytics에서 관리
 */
export const captureAnalyticsEvent = (eventName: string, properties?: Record<string, unknown>) => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	runPostHogOperation('capture', () => posthog.capture(eventName, properties));
};

/**
 * 이후 이벤트를 특정 사용자 Person에 연결
 * distinctId와 Person 속성 결정은 호출자가 맡음
 */
export const identifyAnalyticsUser = (userId: string, properties: { slug: string; nickname: string }) => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	runPostHogOperation('identify', () => posthog.identify(userId, properties));
};

/**
 * 로그아웃 또는 계정 전환 시 이전 Person과의 연결을 해제
 */
export const resetAnalyticsIdentity = () => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	runPostHogOperation('reset', () => posthog.reset());
};
