import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { createTestQueryClient } from '@/test/render-with-query';

import AuthenticatedQueryCacheSubscriber from './AuthenticatedQueryCacheSubscriber';
import AuthProvider from './AuthProvider';

const { readPostDetailMock, registerProxySessionMock } = vi.hoisted(() => ({
	readPostDetailMock: vi.fn(),
	registerProxySessionMock: vi.fn(),
}));

vi.mock('@/shared/api/posts/api', () => ({ readPostDetail: readPostDetailMock }));
vi.mock('@/shared/api/proxy/api', () => ({
	registerProxySession: registerProxySessionMock,
	clearProxySession: vi.fn().mockResolvedValue(undefined),
}));

function DetailState() {
	const { isAuthenticated, isInitialized, sessionVersion } = useAuth();
	const detail = usePostDetailQuery({
		slug: '@rilog',
		postId: 42,
		sessionVersion,
		isEnabled: isAuthenticated && isInitialized,
	});
	return (
		<>
			<p>{`${isAuthenticated}:${isInitialized}:${sessionVersion}`}</p>
			<p>{detail.data?.message ?? 'no detail'}</p>
		</>
	);
}

const renderSession = (strict = false) => {
	const queryClient = createTestQueryClient();
	const session = (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<AuthenticatedQueryCacheSubscriber />
				<DetailState />
			</AuthProvider>
		</QueryClientProvider>
	);
	render(strict ? <StrictMode>{session}</StrictMode> : session);
	return queryClient;
};

describe('인증 세대별 게시글 상세', () => {
	beforeEach(async () => {
		await tokenManager.publishLogout();
		vi.clearAllMocks();
		vi.spyOn(tokenManager, 'refresh').mockResolvedValue(null);
		registerProxySessionMock.mockResolvedValue(undefined);
	});
	afterEach(() => vi.restoreAllMocks());

	it.each([false, true])(
		'A의 지연 응답 도중 로그아웃 %s 후 B로 전환하면 A 요청을 취소하고 B 응답만 표시한다',
		async (logout) => {
			const oldResponse = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
			let oldSignal: AbortSignal | undefined;
			readPostDetailMock.mockImplementation((_request, options: { signal: AbortSignal; cache: string }) => {
				expect(options.cache).toBe('no-store');
				if (tokenManager.getToken() === 'A') {
					oldSignal = options.signal;
					return oldResponse.promise;
				}
				return Promise.resolve({ status: 200, message: 'B detail' });
			});
			const queryClient = renderSession();
			await screen.findByText(`false:true:${tokenManager.getSessionVersion()}`);
			await act(async () => {
				await tokenManager.publishLogin('A');
			});
			await waitFor(() => expect(oldSignal).toBeDefined());
			const oldVersion = tokenManager.getSessionVersion();
			if (logout)
				await act(async () => {
					await tokenManager.publishLogout();
				});
			const registration = Promise.withResolvers<void>();
			registerProxySessionMock.mockReturnValueOnce(registration.promise);
			let login!: Promise<void>;
			act(() => {
				login = tokenManager.publishLogin('B');
			});
			expect(screen.getByText(`false:false:${tokenManager.getSessionVersion()}`)).toBeInTheDocument();
			expect(oldSignal?.aborted).toBe(true);
			expect(readPostDetailMock).toHaveBeenCalledOnce();
			expect(screen.queryByText('A detail')).not.toBeInTheDocument();
			await act(async () => {
				registration.resolve();
				await login;
			});
			expect(await screen.findByText('B detail')).toBeInTheDocument();
			await act(async () => {
				oldResponse.resolve({ status: 200, message: 'A detail' });
				await oldResponse.promise;
			});
			expect(screen.queryByText('A detail')).not.toBeInTheDocument();
			expect(screen.getByText('B detail')).toBeInTheDocument();
			expect(queryClient.getQueryData(postsQueryKeys.detail('rilog', 42, oldVersion))).toBeUndefined();
			expect(
				queryClient.getQueryData(postsQueryKeys.detail('rilog', 42, tokenManager.getSessionVersion())),
			).toMatchObject({ message: 'B detail' });
		},
	);

	it('A의 캐시가 있어도 직접 B로 전환하면 새 세대와 준비 상태를 즉시 제공하고 로그아웃에서 상세를 숨긴다', async () => {
		readPostDetailMock.mockImplementation(() =>
			Promise.resolve({ status: 200, message: `${tokenManager.getToken()} detail` }),
		);
		renderSession();
		await screen.findByText(`false:true:${tokenManager.getSessionVersion()}`);
		await act(async () => {
			await tokenManager.publishLogin('A');
		});
		await screen.findByText('A detail');
		const registration = Promise.withResolvers<void>();
		registerProxySessionMock.mockReturnValueOnce(registration.promise);
		let login!: Promise<void>;
		act(() => {
			login = tokenManager.publishLogin('B');
		});
		expect(screen.queryByText('A detail')).not.toBeInTheDocument();
		expect(screen.getByText(`false:false:${tokenManager.getSessionVersion()}`)).toBeInTheDocument();
		await act(async () => {
			registration.resolve();
			await login;
		});
		await screen.findByText('B detail');
		await act(async () => {
			await tokenManager.publishLogout();
		});
		expect(screen.queryByText('B detail')).not.toBeInTheDocument();
	});

	it('StrictMode 초기 refresh와 A의 proxy 완료가 B보다 늦어도 B가 준비되기 전에 조회하지 않는다', async () => {
		const refresh = Promise.withResolvers<string | null>();
		vi.spyOn(tokenManager, 'refresh').mockReturnValue(refresh.promise);
		readPostDetailMock.mockResolvedValue({ status: 200, message: 'B detail' });
		renderSession(true);
		const first = Promise.withResolvers<void>();
		const second = Promise.withResolvers<void>();
		registerProxySessionMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		let loginA!: Promise<void>;
		let loginB!: Promise<void>;
		act(() => {
			loginA = tokenManager.publishLogin('A');
		});
		act(() => {
			loginB = tokenManager.publishLogin('B');
		});
		await act(async () => {
			first.resolve();
			refresh.resolve(null);
			await loginA;
			await refresh.promise;
		});
		expect(screen.getByText(`false:false:${tokenManager.getSessionVersion()}`)).toBeInTheDocument();
		expect(readPostDetailMock).not.toHaveBeenCalled();
		await act(async () => {
			second.resolve();
			await loginB;
		});
		expect(await screen.findByText('B detail')).toBeInTheDocument();
	});

	it('B 상세를 받은 뒤 A의 proxy 등록이 끝나도 B 상세와 인증 세대를 유지한다', async () => {
		readPostDetailMock.mockResolvedValue({ status: 200, message: 'B detail' });
		renderSession();
		await screen.findByText(`false:true:${tokenManager.getSessionVersion()}`);
		const first = Promise.withResolvers<void>();
		registerProxySessionMock.mockReturnValueOnce(first.promise);
		let loginA!: Promise<void>;
		act(() => {
			loginA = tokenManager.publishLogin('A');
		});
		await act(async () => {
			await tokenManager.publishLogin('B');
		});
		await screen.findByText('B detail');
		const currentVersion = tokenManager.getSessionVersion();
		await act(async () => {
			first.resolve();
			await loginA;
		});
		expect(screen.getByText(`true:true:${currentVersion}`)).toBeInTheDocument();
		expect(screen.getByText('B detail')).toBeInTheDocument();
		expect(readPostDetailMock).toHaveBeenCalledOnce();
	});
});
