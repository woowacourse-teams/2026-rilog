import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthenticatedQueryCacheSubscriber from '@/features/auth/ui/AuthenticatedQueryCacheSubscriber';
import AuthProvider from '@/features/auth/ui/AuthProvider';
import { tokenManager } from '@/shared/api/auth/token-manager';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';
import { createTestQueryClient } from '@/test/render-with-query';

import PostDetailViewerMeta from './PostDetailViewerMeta';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const detailResponse = (): ApiResponse<PostDetailResponse> => ({
	status: 200,
	message: 'OK',
	data: createPostDetailResponseFixture({ viewCount: 9, viewerPermissions: { canEdit: true, canDelete: true } }),
});
const clients: ReturnType<typeof createTestQueryClient>[] = [];

beforeEach(async () => {
	await tokenManager.publishLogout();
	replace.mockClear();
	vi.spyOn(tokenManager, 'refresh').mockResolvedValue(null);
	// Keep the real proxy update queue, replacing only its HTTP boundary.
	vi.stubGlobal(
		'fetch',
		vi.fn((input: RequestInfo | URL) => {
			if (input === '/api/auth/proxy-session') return Promise.resolve(new Response(null, { status: 204 }));
			throw new Error('Only proxy-session HTTP requests are expected in this test.');
		}),
	);
});

afterEach(async () => {
	cleanup();
	clients.splice(0).forEach((client) => client.clear());
	await tokenManager.publishLogout();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function startAcceptedDeletion() {
	const refetch = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
	const read = vi
		.spyOn(postsApi, 'readPostDetail')
		.mockResolvedValueOnce(detailResponse())
		.mockReturnValueOnce(refetch.promise)
		.mockResolvedValue(detailResponse());
	const remove = vi.spyOn(postsApi, 'deletePost').mockResolvedValue(new Response(null, { status: 204 }));
	const client = createTestQueryClient();
	clients.push(client);
	render(
		<QueryClientProvider client={client}>
			<AuthProvider>
				<AuthenticatedQueryCacheSubscriber />
				<PostDetailViewerMeta slug="team" postId={42} />
			</AuthProvider>
		</QueryClientProvider>,
	);
	await act(async () => {
		await tokenManager.publishLogin('account-A');
	});
	const sessionVersion = tokenManager.getSessionVersion();
	const user = userEvent.setup();
	await user.click(await screen.findByRole('button', { name: '삭제' }));
	await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
	await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
	expect(client.isMutating()).toBe(1);
	expect(remove).toHaveBeenCalledExactlyOnceWith(42);
	return { client, refetch, sessionVersion };
}

describe('삭제 후 이동의 실제 인증 세대 경계', () => {
	it.each([
		['로그아웃', () => tokenManager.publishLogout()],
		['B 로그인', () => tokenManager.publishLogin('account-B')],
		['온보딩 전환', () => tokenManager.publishOnboarding('account-B')],
	] as const)('상세 재조회 대기 중 %s이 재조회를 취소해도 이전 삭제로 이동하지 않는다', async (_name, transition) => {
		const { client, refetch, sessionVersion } = await startAcceptedDeletion();
		// Cancellation settles invalidation while React still batches the new session render.
		await act(async () => {
			await transition();
		});
		await waitFor(() => expect(client.isMutating()).toBe(0));
		expect(tokenManager.getSessionVersion()).not.toBe(sessionVersion);
		expect(replace).not.toHaveBeenCalled();
		expect(client.getQueryData(postsQueryKeys.detail('team', 42, sessionVersion))).toBeUndefined();
		await act(async () => {
			refetch.resolve(detailResponse());
			await refetch.promise;
		});
		expect(replace).not.toHaveBeenCalled();
	});

	it('같은 세션의 토큰만 갱신되면 상세 재조회 후 정상적으로 이동한다', async () => {
		const { client, refetch, sessionVersion } = await startAcceptedDeletion();
		tokenManager.setToken('refreshed-account-A');
		expect(tokenManager.getSessionVersion()).toBe(sessionVersion);
		await act(async () => {
			refetch.resolve(detailResponse());
			await refetch.promise;
		});
		await waitFor(() => expect(client.isMutating()).toBe(0));
		expect(replace).toHaveBeenCalledExactlyOnceWith('/@team');
	});
});
