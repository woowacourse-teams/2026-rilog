import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ky from 'ky';
import posthog from 'posthog-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaptureResult } from 'posthog-js';

import { analytics } from '@/features/analytics/model/events';
import AuthProvider from '@/features/auth/ui/AuthProvider';
import GitHubCallbackHandler from '@/features/login/ui/GitHubCallbackHandler';
import SignUpForm from '@/features/sign-up/ui/SignUpForm';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { renderWithQuery } from '@/test/render-with-query';

import AnalyticsIdentitySubscriber from './AnalyticsIdentitySubscriber';

const { callbackMock, onboardingMock, readMyInfoMock, replaceMock } = vi.hoisted(() => ({
	callbackMock: vi.fn(),
	onboardingMock: vi.fn(),
	readMyInfoMock: vi.fn(),
	replaceMock: vi.fn(),
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
	useSearchParams: () => new URLSearchParams('code=test-code&state=test-state'),
}));
vi.mock('@/shared/api/auth/api', () => ({ handleGitHubCallback: callbackMock }));
vi.mock('@/shared/api/users/api', () => ({ completeOnboarding: onboardingMock, readMyInfo: readMyInfoMock }));
vi.mock('@/shared/api/proxy/api', () => ({
	registerProxySession: () => Promise.resolve(),
	clearProxySession: () => Promise.resolve(),
}));
vi.mock('@/shared/api/availability/api', () => ({
	checkNicknameAvailability: () => Promise.resolve({ status: 200, message: '사용 가능', data: null }),
	checkSlugAvailability: () => Promise.resolve({ status: 200, message: '사용 가능', data: null }),
}));

const events: CaptureResult[] = [];

beforeAll(() => {
	posthog.init('identity-flow-test', {
		api_host: 'https://posthog.invalid',
		defaults: '2026-08-29',
		advanced_disable_flags: true,
		disable_external_dependency_loading: true,
		disable_session_recording: true,
		capture_pageview: false,
		capture_pageleave: false,
		autocapture: false,
		before_send: (event) => {
			if (event) events.push(event);
			return null;
		},
	});
});
afterAll(() => posthog.opt_out_capturing());

describe('실제 PostHog SDK를 통한 로그인 전후 identity 연결', () => {
	beforeEach(async () => {
		await tokenManager.publishLogout();
		vi.clearAllMocks();
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'identity-flow-test');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://posthog.invalid');
		vi.spyOn(ky, 'post').mockResolvedValue(new Response(null, { status: 401 }));
		posthog.reset();
		events.length = 0;
		sessionStorage.clear();
		localStorage.removeItem('postLoginRedirect');
		readMyInfoMock.mockImplementation(() => {
			expect(tokenManager.getToken()).toBe('access-token');
			return Promise.resolve({
				status: 200,
				data: { id: 42, slug: 'rilog', nickname: '리로그', profileImageUrl: null },
			});
		});
		onboardingMock.mockResolvedValue({ data: { status: 200, data: null }, accessToken: 'access-token' });
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it.each(['PENDING', 'COMPLETED'] as const)(
		'%s 사용자의 사전 탐색과 로그인 완료를 같은 사용자에 연결하는 이벤트를 생성한다',
		async (onboardingStatus) => {
			const anonymousId = posthog.get_distinct_id();
			const visit = renderWithQuery(
				<AuthProvider>
					<AnalyticsIdentitySubscriber />
				</AuthProvider>,
			);
			await act(async () => {
				await tokenManager.refresh();
			});
			analytics.aboutPageViewed({ acquisitionSource: 'unattributed' });
			expect(posthog.get_distinct_id()).toBe(anonymousId);
			visit.unmount();

			let completeCallback: (() => void) | undefined;
			callbackMock.mockImplementation(
				() =>
					new Promise((resolve) => {
						completeCallback = () =>
							resolve({
								data: { status: 200, data: { onboardingStatus, redirectUrl: '/' } },
								accessToken: onboardingStatus === 'PENDING' ? 'onboarding-token' : 'access-token',
							});
					}),
			);
			const callback = renderWithQuery(
				<AuthProvider>
					<AnalyticsIdentitySubscriber />
					<GitHubCallbackHandler />
				</AuthProvider>,
			);
			// 정상 흐름 검증: 초기 복구 실패가 끝난 후 OAuth 응답을 전달한다.
			await act(async () => {
				await tokenManager.refresh();
			});
			expect(posthog.get_distinct_id()).toBe(anonymousId);
			await act(async () => {
				completeCallback?.();
				await Promise.resolve();
			});

			if (onboardingStatus === 'PENDING') {
				await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/sign-up'));
				expect(readMyInfoMock).not.toHaveBeenCalled();
				expect(events.some((event) => event.event === '$identify')).toBe(false);
				callback.rerender(
					<AuthProvider>
						<AnalyticsIdentitySubscriber />
						<SignUpForm />
					</AuthProvider>,
				);
				const user = userEvent.setup();
				await user.type(screen.getByRole('textbox', { name: '닉네임' }), '리로그');
				await user.type(screen.getByRole('textbox', { name: '고유 아이디' }), 'rilog');
				await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
				await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));
				await user.click(screen.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' }));
				await user.click(screen.getByRole('button', { name: '시작하기' }));
				await waitFor(() => expect(events.some((event) => event.event === 'sign up completed')).toBe(true));
			}
			await waitFor(() => expect(posthog.get_distinct_id()).toBe('42'));
			expect(events.find((event) => event.event === 'about page viewed')?.properties.distinct_id).toBe(anonymousId);
			expect(events.filter((event) => event.event === '$identify')).toHaveLength(1);
			expect(events.find((event) => event.event === '$identify')?.properties).toMatchObject({
				distinct_id: '42',
				$anon_distinct_id: anonymousId,
			});
			analytics.feedViewed({ feedScope: 'ALL', category: 'ALL' });
			expect(events.at(-1)?.properties.distinct_id).toBe('42');
			expect(readMyInfoMock).toHaveBeenCalledOnce();
		},
	);
});
