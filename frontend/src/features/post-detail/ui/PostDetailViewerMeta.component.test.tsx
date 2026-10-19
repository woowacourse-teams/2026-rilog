import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { tokenManager } from '@/shared/api/auth/token-manager';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { createApiFailure } from '@/test/fixtures/api-error';
import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';
import { createTestQueryClient } from '@/test/render-with-query';

import PostDetailViewerMeta from './PostDetailViewerMeta';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));
afterEach(() => {
	vi.restoreAllMocks();
	replace.mockClear();
});

const response = (viewCount: number | null, canEdit = true) => ({
	status: 200,
	message: 'OK',
	data: createPostDetailResponseFixture({ viewCount, viewerPermissions: { canEdit, canDelete: viewCount !== null } }),
});

function setup({ ready = true, authenticated = true } = {}) {
	let currentVersion = 0;
	vi.spyOn(tokenManager, 'getSessionVersion').mockImplementation(() => currentVersion);
	const queryClient = createTestQueryClient();
	const tree = (version: number, initialized: boolean, loggedIn: boolean) => (
		<QueryClientProvider client={queryClient}>
			<AUTH_CONTEXT.Provider
				value={{ isInitialized: initialized, isAuthenticated: loggedIn, isOnboarding: false, sessionVersion: version }}
			>
				<PostDetailViewerMeta slug="team" postId={42} />
			</AUTH_CONTEXT.Provider>
		</QueryClientProvider>
	);
	const rendered = render(tree(0, ready, authenticated));
	return {
		queryClient,
		change: (version: number, initialized = true, loggedIn = true) => {
			currentVersion = version;
			rendered.rerender(tree(version, initialized, loggedIn));
		},
	};
}

describe('PostDetailViewerMeta와 실제 상세 query', () => {
	it('삭제 대기 중 상세를 재조회해도 중복 삭제를 막는다', async () => {
		const user = userEvent.setup();
		const deletion = Promise.withResolvers<Response>();
		const refetch = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
		vi.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce(response(9))
			.mockReturnValueOnce(refetch.promise)
			.mockResolvedValue(response(9));
		const remove = vi.spyOn(postsApi, 'deletePost').mockReturnValue(deletion.promise);
		const { queryClient } = setup();
		await user.click(await screen.findByRole('button', { name: '삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
		let revalidation: Promise<void>;
		act(() => {
			revalidation = queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() });
		});
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await act(async () => {
			refetch.resolve(response(9));
			await revalidation;
		});
		expect(await screen.findByRole('button', { name: '삭제' })).toBeDisabled();
		expect(remove).toHaveBeenCalledOnce();
		await act(async () => {
			deletion.resolve(new Response(null, { status: 204 }));
			await deletion.promise;
		});
		await waitFor(() => expect(replace).toHaveBeenCalledExactlyOnceWith('/@team'));
	});

	it('A 삭제 응답이 늦어도 B 세션을 이전 블로그로 이동시키지 않는다', async () => {
		const user = userEvent.setup();
		const deletion = Promise.withResolvers<Response>();
		vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue(response(9));
		vi.spyOn(postsApi, 'deletePost').mockReturnValue(deletion.promise);
		const { queryClient, change } = setup();
		await user.click(await screen.findByRole('button', { name: '삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
		change(1, false);
		change(1);
		await screen.findByLabelText('조회수 9회');
		await act(async () => {
			deletion.resolve(new Response(null, { status: 204 }));
			await deletion.promise;
		});
		await waitFor(() => expect(queryClient.isMutating()).toBe(0));
		expect(replace).not.toHaveBeenCalled();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('삭제 성공 뒤 상세 재조회가 지연되고 404로 끝나도 블로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		const refetch = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
		const notFound = await createApiFailure('POST_NOT_FOUND', 404);
		const read = vi
			.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce(response(9))
			.mockReturnValueOnce(refetch.promise);
		const remove = vi.spyOn(postsApi, 'deletePost').mockResolvedValue(new Response(null, { status: 204 }));
		const { queryClient } = setup();
		await user.click(await screen.findByRole('button', { name: '삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
		await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		await act(async () => {
			refetch.reject(notFound);
			await Promise.resolve();
		});
		await waitFor(() => expect(queryClient.isMutating()).toBe(0));
		expect(remove).toHaveBeenCalledExactlyOnceWith(42);
		expect(replace).toHaveBeenCalledExactlyOnceWith('/@team');
	});

	it('같은 세션에서 삭제 권한이 사라졌다 복구돼도 이전 삭제 모달을 다시 열지 않는다', async () => {
		const user = userEvent.setup();
		vi.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce(response(9))
			.mockResolvedValueOnce(response(null, false))
			.mockResolvedValueOnce(response(9));
		const { queryClient } = setup();
		await user.click(await screen.findByRole('button', { name: '삭제' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		await act(async () => {
			await queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() });
		});
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await act(async () => {
			await queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() });
		});
		await screen.findByRole('button', { name: '삭제' });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('A의 열린 삭제 모달을 새 권한자 B에게 이어서 표시하지 않는다', async () => {
		const user = userEvent.setup();
		vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue(response(9));
		const { change } = setup();
		await user.click(await screen.findByRole('button', { name: '삭제' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		change(1, false);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		change(1);
		await screen.findByRole('button', { name: '삭제' });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it.each([0, 1234])('삭제 권한자의 조회수 %i와 액션을 하나의 GET으로 표시한다', async (count) => {
		const read = vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue(response(count));
		setup();
		expect(await screen.findByLabelText(`조회수 ${count.toLocaleString('ko-KR')}회`)).toHaveTextContent(
			`조회수 ${count.toLocaleString('ko-KR')}`,
		);
		expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
		expect(read).toHaveBeenCalledOnce();
	});
	it.each([
		{ ready: false, authenticated: true },
		{ ready: true, authenticated: false },
	])('인증 준비 전과 비회원은 숫자와 액션을 숨기고 GET도 시작하지 않는다: %j', (auth) => {
		const read = vi.spyOn(postsApi, 'readPostDetail');
		setup(auth);
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
		expect(read).not.toHaveBeenCalled();
	});
	it('일반 회원과 수정 권한만 있는 사용자는 null 조회수를 표시하지 않는다', async () => {
		vi.spyOn(postsApi, 'readPostDetail').mockResolvedValue(response(null));
		setup();
		expect(await screen.findByRole('button', { name: '수정' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
	});
	it('조회 중과 실패에는 이전 숫자를 숨기고 가짜 0을 표시하지 않는다', async () => {
		const pending = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
		const read = vi
			.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce(response(11))
			.mockReturnValueOnce(pending.promise);
		const { queryClient } = setup();
		await screen.findByLabelText('조회수 11회');
		let refetch: Promise<void>;
		act(() => {
			refetch = queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() });
		});
		await waitFor(() => expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument());
		await act(async () => {
			pending.reject(new TypeError('Failed to fetch'));
			await refetch;
		});
		expect(read).toHaveBeenCalledTimes(2);
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});
	it('Colog 삭제 권한이 사라진 상세 응답을 받으면 숫자와 삭제 버튼을 숨긴다', async () => {
		const owner = {
			type: 'COLOG' as const,
			blogId: 2,
			slug: 'team',
			name: '팀',
			profileImageUrl: null,
			coverImageUrl: null,
			memberCount: 3,
			postCount: 2,
		};
		vi.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce({
				...response(8),
				data: createPostDetailResponseFixture({
					owner,
					viewCount: 8,
					viewerPermissions: { canEdit: false, canDelete: true },
				}),
			})
			.mockResolvedValueOnce({ ...response(null, false), data: createPostDetailResponseFixture({ owner }) });
		const { queryClient } = setup();
		await screen.findByLabelText('조회수 8회');
		await act(async () => {
			await queryClient.invalidateQueries({ queryKey: postsQueryKeys.details() });
		});
		await waitFor(() => expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument());
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});
	it('A 응답이 지연돼도 로그아웃과 B 전환 이후 A 숫자·권한을 표시하지 않는다', async () => {
		const a = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
		const b = Promise.withResolvers<ApiResponse<PostDetailResponse>>();
		vi.spyOn(postsApi, 'readPostDetail').mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
		const { change } = setup();
		change(1, true, false);
		change(2);
		await act(async () => {
			a.resolve(response(99));
			await a.promise;
		});
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		await act(async () => {
			b.resolve(response(null, false));
			await b.promise;
		});
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
	it('직접 A→B 전환에서도 cached A 숫자를 즉시 숨긴다', async () => {
		vi.spyOn(postsApi, 'readPostDetail')
			.mockResolvedValueOnce(response(99))
			.mockReturnValue(new Promise(() => {}));
		const { change } = setup();
		await screen.findByLabelText('조회수 99회');
		change(1, false);
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
		change(1);
		expect(screen.queryByLabelText(/조회수/)).not.toBeInTheDocument();
	});
});
