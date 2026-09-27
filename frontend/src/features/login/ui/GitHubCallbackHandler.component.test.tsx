import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiFailure } from '@/test/fixtures/api-error';

import GitHubCallbackHandler from './GitHubCallbackHandler';

const {
	captureExceptionMock,
	searchParamsMock,
	githubLoginCompletedMock,
	githubLoginFailedMock,
	clearSignUpFlowMock,
	handleGitHubCallbackMock,
	publishLoginMock,
	publishOnboardingMock,
	replaceMock,
	startSignUpFlowMock,
} = vi.hoisted(() => ({
	captureExceptionMock: vi.fn(),
	searchParamsMock: vi.fn(),
	githubLoginCompletedMock: vi.fn(),
	githubLoginFailedMock: vi.fn(),
	clearSignUpFlowMock: vi.fn(),
	handleGitHubCallbackMock: vi.fn(),
	publishLoginMock: vi.fn(),
	publishOnboardingMock: vi.fn(),
	replaceMock: vi.fn(),
	startSignUpFlowMock: vi.fn(),
}));

vi.mock('@/shared/error-tracking/error-tracker-instance', async () => {
	const { createSentryErrorTracker } = await import('@/shared/error-tracking/sentry-error-tracker');
	const tracker = createSentryErrorTracker();
	tracker.captureException = captureExceptionMock;
	return { errorTracker: tracker, sentryErrorTracker: tracker };
});

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		githubLoginCompleted: githubLoginCompletedMock,
		githubLoginFailed: githubLoginFailedMock,
	},
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
	useSearchParams: searchParamsMock,
}));

vi.mock('@/features/sign-up/lib/sign-up-flow-session', () => ({
	clearSignUpFlow: clearSignUpFlowMock,
	startSignUpFlow: startSignUpFlowMock,
}));

vi.mock('@/shared/api/auth/api', () => ({
	handleGitHubCallback: handleGitHubCallbackMock,
}));

vi.mock('@/shared/api/auth/token-manager', () => ({
	tokenManager: { publishLogin: publishLoginMock, publishOnboarding: publishOnboardingMock },
}));

describe('GitHubCallbackHandler', () => {
	beforeEach(() => {
		captureExceptionMock.mockReset();
		searchParamsMock.mockReturnValue(new URLSearchParams('code=github-code&state=github-state'));
		clearSignUpFlowMock.mockReset();
		githubLoginCompletedMock.mockReset();
		githubLoginFailedMock.mockReset();
		handleGitHubCallbackMock.mockReset();
		publishLoginMock.mockReset().mockResolvedValue(undefined);
		publishOnboardingMock.mockReset().mockResolvedValue(undefined);
		replaceMock.mockReset();
		startSignUpFlowMock.mockReset();
		localStorage.clear();
	});

	it('온보딩 세션 등록을 기다린 뒤 회원가입 흐름을 시작하고 이동한다', async () => {
		let finishOnboarding: (() => void) | undefined;
		publishOnboardingMock.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishOnboarding = resolve;
				}),
		);
		handleGitHubCallbackMock.mockResolvedValue({
			data: {
				status: 200,
				message: 'success',
				data: { onboardingStatus: 'PENDING', redirectUrl: '/sign-up' },
			},
			accessToken: 'onboarding-token',
		});

		render(<GitHubCallbackHandler />);

		await waitFor(() => expect(publishOnboardingMock).toHaveBeenCalledWith('onboarding-token'));
		expect(replaceMock).not.toHaveBeenCalled();
		expect(startSignUpFlowMock).not.toHaveBeenCalled();
		finishOnboarding?.();
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/sign-up'));
		expect(publishLoginMock).not.toHaveBeenCalled();
		expect(startSignUpFlowMock).toHaveBeenCalledOnce();
		expect(githubLoginCompletedMock).toHaveBeenCalledWith({ userType: 'new' });
		expect(publishOnboardingMock.mock.invocationCallOrder[0]).toBeLessThan(
			startSignUpFlowMock.mock.invocationCallOrder[0] ?? 0,
		);
	});

	it('온보딩을 완료한 사용자는 남아 있는 회원가입 흐름을 제거한다', async () => {
		handleGitHubCallbackMock.mockResolvedValue({
			data: {
				status: 200,
				message: 'success',
				data: { onboardingStatus: 'COMPLETED', redirectUrl: '/' },
			},
			accessToken: 'access-token',
		});

		render(<GitHubCallbackHandler />);

		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
		expect(publishLoginMock).toHaveBeenCalledWith('access-token');
		expect(publishOnboardingMock).not.toHaveBeenCalled();
		expect(clearSignUpFlowMock).toHaveBeenCalledOnce();
		expect(startSignUpFlowMock).not.toHaveBeenCalled();
		expect(githubLoginCompletedMock).toHaveBeenCalledWith({ userType: 'returning' });
	});

	it.each(['OAUTH_CALLBACK_PARAMETER_MISSING', 'GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED', 'GITHUB_USER_FETCH_FAILED'])(
		'%s는 수집하고 홈으로 복구한다',
		async (code) => {
			const error = await createApiFailure(code);
			handleGitHubCallbackMock.mockRejectedValue(error);
			render(<GitHubCallbackHandler />);
			await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
			expect(captureExceptionMock).toHaveBeenCalledWith(error, {
				tags: { operation: 'oauth.callback' },
				level: 'error',
			});
		},
	);

	it.each(['OAUTH_REQUEST_FAILED', 'INVALID_OAUTH_STATE'])('%s의 정상 취소/만료는 분석만 남긴다', async (code) => {
		searchParamsMock.mockReturnValue(new URLSearchParams('error=access_denied'));
		handleGitHubCallbackMock.mockRejectedValue(await createApiFailure(code));
		render(<GitHubCallbackHandler />);
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
		expect(captureExceptionMock).not.toHaveBeenCalled();
		expect(githubLoginFailedMock).toHaveBeenCalledWith({ failureStage: 'github_callback', errorCode: code });
	});

	it('로그인 처리 실패를 stage와 안전한 오류 코드로 기록한다', async () => {
		handleGitHubCallbackMock.mockRejectedValue(new Error('callback failed'));

		render(<GitHubCallbackHandler />);

		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
		expect(githubLoginFailedMock).toHaveBeenCalledWith({
			failureStage: 'github_callback',
			errorCode: 'UNKNOWN_ERROR',
		});
	});
});
