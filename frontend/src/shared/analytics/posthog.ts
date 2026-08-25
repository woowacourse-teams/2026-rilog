import posthog from 'posthog-js';

const isAnalyticsConfigured = () =>
	Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST);

export const initializeAnalytics = () => {
	const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
	const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

	if (!isAnalyticsConfigured() || !projectToken || !host) {
		if (process.env.NODE_ENV === 'development') {
			console.warn('[PostHog] 프로젝트 token 또는 host가 없어 분석 이벤트를 전송하지 않습니다.');
		}

		return;
	}

	posthog.init(projectToken, {
		api_host: host,
		defaults: '2026-08-29',
		autocapture: false,
		disable_session_recording: true,
		capture_pageview: true,
		capture_pageleave: true,
		debug: process.env.NODE_ENV === 'development',
	});
};

/**
 * 분석 환경이 설정된 경우에만 사용자 행동 이벤트를 전송
 * 이벤트 이름과 payload 구성은 features/analytics에서 관리
 */
export const captureAnalyticsEvent = (eventName: string, properties?: Record<string, unknown>) => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	posthog.capture(eventName, properties);
};

/**
 * 이후 이벤트를 특정 사용자 Person에 연결
 * distinctId와 Person 속성 결정은 호출자가 맡음
 */
export const identifyAnalyticsUser = (userId: string, properties: { slug: string; nickname: string }) => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	posthog.identify(userId, properties);
};

/**
 * 로그아웃 또는 계정 전환 시 이전 Person과의 연결을 해제
 */
export const resetAnalyticsIdentity = () => {
	if (!isAnalyticsConfigured()) {
		return;
	}

	posthog.reset();
};
