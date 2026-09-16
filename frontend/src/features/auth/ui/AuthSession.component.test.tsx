import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';

import AuthProvider from './AuthProvider';

const { readMyInfoMock, registerProxySessionMock } = vi.hoisted(() => ({
	readMyInfoMock: vi.fn(),
	registerProxySessionMock: vi.fn(),
}));

vi.mock('@/shared/api/users/api', () => ({ readMyInfo: readMyInfoMock }));
vi.mock('@/shared/api/proxy/api', () => ({
	registerProxySession: registerProxySessionMock,
	clearProxySession: vi.fn().mockResolvedValue(undefined),
}));

function SessionState() {
	const { isAuthenticated, isInitialized, isOnboarding } = useAuth();
	const { data } = useMyInfoQuery();
	return (
		<>
			<p>{`${isInitialized}:${isAuthenticated}:${isOnboarding}`}</p>
			{data?.data && <p>{data.data.nickname}</p>}
		</>
	);
}

const renderSession = () =>
	render(
		<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
			<AuthProvider>
				<SessionState />
			</AuthProvider>
		</QueryClientProvider>,
	);

describe('인증 세션과 내 정보 조회', () => {
	beforeEach(async () => {
		await tokenManager.publishLogout();
		vi.clearAllMocks();
		registerProxySessionMock.mockResolvedValue(undefined);
		readMyInfoMock.mockImplementation(() => {
			expect(tokenManager.getToken()).toBe('access-token');
			return Promise.resolve({
				status: 200,
				message: 'OK',
				data: { id: 1, slug: 'rilog', nickname: '리로그', profileImageUrl: null },
			});
		});
	});

	afterEach(() => vi.restoreAllMocks());

	it('온보딩 토큰으로 재마운트해도 가입 접근을 유지하고 정식 로그인 전에는 내 정보를 조회하지 않는다', async () => {
		await tokenManager.publishOnboarding('onboarding-token');
		const refreshSpy = vi.spyOn(tokenManager, 'refresh');
		renderSession();

		await waitFor(() => expect(screen.getByText('true:false:true')).toBeInTheDocument());
		expect(registerProxySessionMock).toHaveBeenCalledOnce();
		expect(readMyInfoMock).not.toHaveBeenCalled();
		expect(refreshSpy).not.toHaveBeenCalled();

		await act(async () => {
			await tokenManager.publishLogin('access-token');
		});
		expect(await screen.findByText('리로그')).toBeInTheDocument();
		expect(screen.getByText('true:true:false')).toBeInTheDocument();
		expect(readMyInfoMock).toHaveBeenCalledOnce();
	});

	it('익명 상태에서 온보딩으로 전환하면 proxy 등록을 기다리고 로그아웃 시 온보딩 상태를 해제한다', async () => {
		vi.spyOn(tokenManager, 'refresh').mockResolvedValue(null);
		renderSession();
		await waitFor(() => expect(screen.getByText('true:false:false')).toBeInTheDocument());

		let finishRegistration: (() => void) | undefined;
		registerProxySessionMock.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					finishRegistration = resolve;
				}),
		);
		let transition: Promise<void>;
		act(() => {
			transition = tokenManager.publishOnboarding('onboarding-token');
		});
		await waitFor(() => expect(registerProxySessionMock).toHaveBeenCalledOnce());
		expect(readMyInfoMock).not.toHaveBeenCalled();
		await act(async () => {
			finishRegistration?.();
			await transition;
		});
		expect(screen.getByText('true:false:true')).toBeInTheDocument();

		await act(async () => {
			await tokenManager.publishLogout();
		});
		expect(screen.getByText('true:false:false')).toBeInTheDocument();
		expect(readMyInfoMock).not.toHaveBeenCalled();
	});
});
