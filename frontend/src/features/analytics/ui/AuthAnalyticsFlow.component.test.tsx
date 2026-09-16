import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ky from 'ky';
import posthog from 'posthog-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaptureResult } from 'posthog-js';

import { analytics } from '@/features/analytics/model/events';
import AuthenticatedQueryCacheSubscriber from '@/features/auth/ui/AuthenticatedQueryCacheSubscriber';
import AuthProvider from '@/features/auth/ui/AuthProvider';
import GitHubCallbackHandler from '@/features/login/ui/GitHubCallbackHandler';
import SignUpForm from '@/features/sign-up/ui/SignUpForm';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';
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

	it.each(['42', 'other-user'])(
		'SDK에 남은 계정(%s)으로 재방문하면 실제 로그인 계정을 기준으로 식별한다',
		async (previousUserId) => {
			posthog.identify(previousUserId);
			const reset = vi.spyOn(posthog, 'reset');
			await tokenManager.publishLogin('access-token');
			renderWithQuery(
				<AuthProvider>
					<AuthenticatedQueryCacheSubscriber />
					<AnalyticsIdentitySubscriber />
				</AuthProvider>,
			);
			await waitFor(() => expect(posthog.get_distinct_id()).toBe('42'));
			await waitFor(() => expect(readMyInfoMock).toHaveBeenCalledOnce());
			expect(reset).toHaveBeenCalledTimes(previousUserId === '42' ? 0 : 1);
		},
	);

	it('로그아웃 없이 새 로그인해도 이전 캐시 대신 새 사용자를 조회하고 식별한다', async () => {
		await tokenManager.publishLogin('access-token');
		const view = renderWithQuery(
			<AuthProvider>
				<AuthenticatedQueryCacheSubscriber />
				<AnalyticsIdentitySubscriber />
			</AuthProvider>,
		);
		await waitFor(() => expect(posthog.get_distinct_id()).toBe('42'));
		const nextUser = Promise.withResolvers<unknown>();
		readMyInfoMock.mockImplementationOnce((signal: AbortSignal) => {
			expect(signal.aborted).toBe(false);
			return nextUser.promise;
		});
		await act(async () => {
			await tokenManager.publishLogin('next-access-token');
		});
		expect(view.queryClient.getQueryData(usersQueryKeys.myInfo())).toBeUndefined();
		act(() => {
			nextUser.resolve({ status: 200, data: { id: 43, slug: 'next', nickname: '다음 사용자' } });
		});
		await waitFor(() => expect(posthog.get_distinct_id()).toBe('43'));
		expect(readMyInfoMock).toHaveBeenCalledTimes(2);
		await act(async () => {
			await tokenManager.publishLogout();
		});
		const anonymousId = posthog.get_distinct_id();
		expect(anonymousId).not.toBe('43');
		expect(view.queryClient.getQueryData(usersQueryKeys.myInfo())).toBeUndefined();
		await act(async () => {
			await tokenManager.publishLogin('access-token');
		});
		await waitFor(() => expect(posthog.get_distinct_id()).toBe('42'));
		expect(events.filter((event) => event.event === '$identify').at(-1)?.properties.$anon_distinct_id).toBe(
			anonymousId,
		);
	});

	it('내 정보 조회 실패가 로그인을 취소하지 않고 재조회 성공 후 익명 행동을 연결한다', async () => {
		await tokenManager.publishLogin('access-token');
		const anonymousId = posthog.get_distinct_id();
		readMyInfoMock.mockRejectedValueOnce(new Error('temporary failure'));
		const view = renderWithQuery(
			<AuthProvider>
				<AuthenticatedQueryCacheSubscriber />
				<AnalyticsIdentitySubscriber />
			</AuthProvider>,
		);
		await waitFor(() => expect(view.queryClient.getQueryState(usersQueryKeys.myInfo())?.status).toBe('error'));
		expect(tokenManager.getToken()).toBe('access-token');
		expect(posthog.get_distinct_id()).toBe(anonymousId);
		await act(async () => {
			await view.queryClient.refetchQueries({ queryKey: usersQueryKeys.myInfo() });
		});
		await waitFor(() => expect(posthog.get_distinct_id()).toBe('42'));
		expect(events.find((event) => event.event === '$identify')?.properties.$anon_distinct_id).toBe(anonymousId);
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
