import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { tokenManager } from '@/shared/api/auth/token-manager';
import * as postsApi from '@/shared/api/posts/api';
import { createApiFailure } from '@/test/fixtures/api-error';
import { renderWithQuery } from '@/test/render-with-query';

import PostViewRegistration from './PostViewRegistration';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('@/shared/error-tracking/error-tracker-instance', () => ({
	errorTracker: { captureException: capture, captureMessage: vi.fn(), setUser: vi.fn() },
}));
afterEach(() => {
	vi.restoreAllMocks();
	capture.mockClear();
});

function Entry({ ready = true, authenticated = false, postId = 42, selection = 1 }) {
	return (
		<AUTH_CONTEXT.Provider
			value={{
				isAuthenticated: authenticated,
				isInitialized: ready,
				isOnboarding: false,
				sessionVersion: tokenManager.getSessionVersion(),
			}}
		>
			<PostViewRegistration postId={postId} />
			<article key={selection}>본문과 댓글 {selection}</article>
		</AUTH_CONTEXT.Provider>
	);
}

describe('PostViewRegistration', () => {
	it('서버 렌더링은 등록하지 않는다', () => {
		const register = vi.spyOn(postsApi, 'registerPostView').mockResolvedValue();
		expect(renderToString(<Entry />)).toContain('본문과 댓글');
		expect(register).not.toHaveBeenCalled();
	});
	it('초기화 전에는 등록하지 않고 완료 후 본문을 가리지 않은 채 한 번 등록한다', async () => {
		const pending = Promise.withResolvers<void>();
		const register = vi.spyOn(postsApi, 'registerPostView').mockReturnValue(pending.promise);
		const { rerender } = render(<Entry ready={false} />);
		expect(register).not.toHaveBeenCalled();
		rerender(<Entry />);
		expect(screen.getByRole('article')).toHaveTextContent('본문과 댓글');
		expect(register).toHaveBeenCalledExactlyOnceWith(42);
		await act(async () => {
			pending.resolve();
			await pending.promise;
		});
	});
	it('StrictMode·댓글 query·리렌더·같은 방문의 인증 변경은 중복 등록하지 않는다', () => {
		const register = vi.spyOn(postsApi, 'registerPostView').mockResolvedValue();
		const { rerender } = render(
			<StrictMode>
				<Entry />
			</StrictMode>,
		);
		rerender(
			<StrictMode>
				<Entry authenticated selection={2} />
			</StrictMode>,
		);
		rerender(
			<StrictMode>
				<Entry selection={3} />
			</StrictMode>,
		);
		expect(register).toHaveBeenCalledOnce();
	});
	it('다른 글과 실제 재진입에서는 새로 등록한다', () => {
		const register = vi.spyOn(postsApi, 'registerPostView').mockResolvedValue();
		const { rerender, unmount } = render(<Entry postId={42} />);
		rerender(<Entry postId={43} />);
		unmount();
		render(<Entry postId={42} />);
		expect(register.mock.calls.map(([id]) => id)).toEqual([42, 43, 42]);
	});
	it('탭 가시성 변경은 유지하고 BFCache 문서 복원만 새 방문으로 처리한다', () => {
		const register = vi.spyOn(postsApi, 'registerPostView').mockResolvedValue();
		render(<Entry />);
		act(() => {
			document.dispatchEvent(new Event('visibilitychange'));
			window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		});
		expect(register).toHaveBeenCalledOnce();
		act(() => {
			window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
			window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
		});
		expect(register).toHaveBeenCalledTimes(2);
	});
	it.each([
		[503, 'POST_VIEW_REGISTRATION_DISABLED', 0],
		[503, 'INTERNAL_SERVER_ERROR', 1],
		[500, 'INTERNAL_SERVER_ERROR', 1],
		[403, 'PRIVATE_POST_READ_FORBIDDEN', 0],
		[404, 'POST_NOT_FOUND', 0],
	] as const)('HTTP %s / %s 실패에도 본문을 유지하고 보고는 %s회 한다', async (status, code, reports) => {
		const error = await createApiFailure(code, status);
		const register = vi.spyOn(postsApi, 'registerPostView').mockRejectedValue(error);
		const { rerender } = renderWithQuery(<Entry />);
		await act(async () => {
			await Promise.resolve();
		});
		rerender(<Entry selection={2} />);
		expect(screen.getByRole('article')).toHaveTextContent('본문과 댓글 2');
		expect(register).toHaveBeenCalledOnce();
		expect(capture).toHaveBeenCalledTimes(reports);
	});
	it('네트워크 실패는 한 번 보고하며 재전송·상세 갱신을 하지 않는다', async () => {
		const register = vi
			.spyOn(postsApi, 'registerPostView')
			.mockRejectedValue({ type: 'network', cause: new TypeError('Failed to fetch') });
		const read = vi.spyOn(postsApi, 'readPostDetail');
		const { queryClient, rerender } = renderWithQuery(<Entry />);
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
		await waitFor(() => expect(capture).toHaveBeenCalledOnce());
		rerender(<Entry selection={2} />);
		expect(register).toHaveBeenCalledOnce();
		expect(read).not.toHaveBeenCalled();
		expect(invalidate).not.toHaveBeenCalled();
	});
});
