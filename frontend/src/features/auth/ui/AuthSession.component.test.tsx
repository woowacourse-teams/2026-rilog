import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import ky from 'ky';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { createTestQueryClient } from '@/test/render-with-query';

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
		<QueryClientProvider client={createTestQueryClient()}>
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

	it.each(['login', 'onboarding'] as const)(
		'초기 refresh보다 %s 완료가 빠르면 새 세션으로 초기화한다',
		async (transition) => {
			const response = Promise.withResolvers<Response>();
			vi.spyOn(ky, 'post').mockReturnValue(response.promise as ReturnType<typeof ky.post>);
			renderSession();
			await act(async () => {
				if (transition === 'login') await tokenManager.publishLogin('access-token');
				else await tokenManager.publishOnboarding('onboarding-token');
			});
			const expectedStatus = transition === 'login' ? 'true:true:false' : 'true:false:true';
			try {
				expect(screen.getByText(expectedStatus)).toBeInTheDocument();
			} finally {
				await act(async () => {
					response.resolve(new Response(null, { status: 401 }));
					await response.promise;
				});
			}
			expect(screen.getByText(expectedStatus)).toBeInTheDocument();
			expect(registerProxySessionMock).toHaveBeenCalledOnce();
		},
	);

	it('로그아웃 이후 이전 proxy 등록이 완료되어도 인증 상태를 되돌리지 않는다', async () => {
		vi.spyOn(tokenManager, 'refresh').mockResolvedValue(null);
		renderSession();
		await screen.findByText('true:false:false');
		const registration = Promise.withResolvers<void>();
		registerProxySessionMock.mockReturnValueOnce(registration.promise);
		let login: Promise<void>;
		act(() => {
			login = tokenManager.publishLogin('access-token');
		});
		await waitFor(() => expect(registerProxySessionMock).toHaveBeenCalledOnce());
		await act(async () => {
			await tokenManager.publishLogout();
		});
		await act(async () => {
			registration.resolve();
			await login;
		});
		expect(screen.getByText('true:false:false')).toBeInTheDocument();
		expect(readMyInfoMock).not.toHaveBeenCalled();
	});

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
