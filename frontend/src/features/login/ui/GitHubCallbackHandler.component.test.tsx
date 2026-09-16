import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GitHubCallbackHandler from './GitHubCallbackHandler';

const {
	githubLoginCompletedMock,
	githubLoginFailedMock,
	clearSignUpFlowMock,
	handleGitHubCallbackMock,
	publishLoginMock,
	replaceMock,
	startSignUpFlowMock,
} = vi.hoisted(() => ({
	githubLoginCompletedMock: vi.fn(),
	githubLoginFailedMock: vi.fn(),
	clearSignUpFlowMock: vi.fn(),
	handleGitHubCallbackMock: vi.fn(),
	publishLoginMock: vi.fn(),
	replaceMock: vi.fn(),
	startSignUpFlowMock: vi.fn(),
}));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		githubLoginCompleted: githubLoginCompletedMock,
		githubLoginFailed: githubLoginFailedMock,
	},
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
	useSearchParams: () => new URLSearchParams('code=github-code&state=github-state'),
}));

vi.mock('@/features/sign-up/lib/sign-up-flow-session', () => ({
	clearSignUpFlow: clearSignUpFlowMock,
	startSignUpFlow: startSignUpFlowMock,
}));

vi.mock('@/shared/api/auth/api', () => ({
	handleGitHubCallback: handleGitHubCallbackMock,
}));

vi.mock('@/shared/api/auth/token-manager', () => ({
	tokenManager: { publishLogin: publishLoginMock },
}));

describe('GitHubCallbackHandler', () => {
	beforeEach(() => {
		clearSignUpFlowMock.mockReset();
		githubLoginCompletedMock.mockReset();
		githubLoginFailedMock.mockReset();
		handleGitHubCallbackMock.mockReset();
		publishLoginMock.mockReset().mockResolvedValue(undefined);
		replaceMock.mockReset();
		startSignUpFlowMock.mockReset();
		localStorage.clear();
	});

	it('로그인 처리를 마친 뒤 회원가입 흐름을 시작하고 온보딩 페이지로 이동한다', async () => {
		handleGitHubCallbackMock.mockResolvedValue({
			data: {
				status: 200,
				message: 'success',
				data: { onboardingStatus: 'PENDING', redirectUrl: '/sign-up' },
			},
			accessToken: 'access-token',
		});

		render(<GitHubCallbackHandler />);

		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/sign-up'));
		expect(publishLoginMock).toHaveBeenCalledWith('access-token');
		expect(startSignUpFlowMock).toHaveBeenCalledOnce();
		expect(githubLoginCompletedMock).toHaveBeenCalledWith({ userType: 'new' });
		expect(publishLoginMock.mock.invocationCallOrder[0]).toBeLessThan(
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
		expect(clearSignUpFlowMock).toHaveBeenCalledOnce();
		expect(startSignUpFlowMock).not.toHaveBeenCalled();
		expect(githubLoginCompletedMock).toHaveBeenCalledWith({ userType: 'returning' });
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
