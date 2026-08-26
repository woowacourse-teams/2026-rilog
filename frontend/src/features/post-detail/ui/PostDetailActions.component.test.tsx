import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailActions from './PostDetailActions';

const {
	deletePostMutateMock,
	deletePostResetMock,
	routerPushMock,
	routerReplaceMock,
	useAuthMock,
	useDeletePostMutationMock,
	useMyInfoQueryMock,
} = vi.hoisted(() => ({
	deletePostMutateMock: vi.fn(),
	deletePostResetMock: vi.fn(),
	routerPushMock: vi.fn(),
	routerReplaceMock: vi.fn(),
	useAuthMock: vi.fn(),
	useDeletePostMutationMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

vi.mock('@/features/auth/model/use-auth', () => ({
	useAuth: useAuthMock,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

vi.mock('@/shared/api/posts/mutations/use-delete-post-mutation', () => ({
	useDeletePostMutation: useDeletePostMutationMock,
}));

describe('PostDetailActions', () => {
	beforeEach(() => {
		deletePostMutateMock.mockReset();
		deletePostResetMock.mockReset();
		routerPushMock.mockReset();
		routerReplaceMock.mockReset();
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useDeletePostMutationMock.mockReturnValue({
			mutate: deletePostMutateMock,
			reset: deletePostResetMock,
			isPending: false,
			isError: false,
			error: null,
		});
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 7 } } });
	});

	it('로그인한 사용자가 작성자이면 수정과 삭제 버튼을 렌더링하고 수정 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PostDetailActions authorId={7} slug="rilog-team" postId={31} />);

		await user.click(screen.getByRole('button', { name: '수정' }));

		expect(routerPushMock).toHaveBeenCalledWith('/write?postId=31');
		expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
	});

	it('로그인한 사용자가 작성자가 아니면 수정과 삭제 버튼을 렌더링하지 않는다', () => {
		render(<PostDetailActions authorId={8} slug="rilog-team" postId={31} />);

		expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it.each([
		{ isAuthenticated: false, isInitialized: true },
		{ isAuthenticated: false, isInitialized: false },
	])('인증되지 않았거나 인증 초기화 전이면 버튼을 렌더링하지 않는다', (authState) => {
		useAuthMock.mockReturnValue(authState);

		render(<PostDetailActions authorId={7} slug="rilog-team" postId={31} />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('삭제 전에 복구할 수 없음을 안내하고 취소할 수 있다', async () => {
		const user = userEvent.setup();
		render(<PostDetailActions authorId={7} slug="rilog-team" postId={31} />);

		await user.click(screen.getByRole('button', { name: '삭제' }));

		const dialog = screen.getByRole('dialog', { name: '게시글을 삭제할까요?' });
		expect(dialog).toHaveAccessibleDescription('삭제한 게시글은 복구할 수 없습니다.');
		await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus());

		await user.click(within(dialog).getByRole('button', { name: '취소' }));

		expect(deletePostMutateMock).not.toHaveBeenCalled();
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시글을 삭제할까요?' })).not.toBeInTheDocument());
	});

	it('삭제를 확정하면 API를 요청하고 성공 후 블로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PostDetailActions authorId={7} slug="@rilog-team" postId={31} />);

		await user.click(screen.getByRole('button', { name: '삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));

		expect(deletePostMutateMock).toHaveBeenCalledOnce();
		expect(deletePostMutateMock.mock.calls[0]?.[0]).toBe(31);
		const mutationOptions = deletePostMutateMock.mock.calls[0]?.[1] as { onSuccess: () => void };
		expect(typeof mutationOptions.onSuccess).toBe('function');
		act(() => mutationOptions.onSuccess());

		expect(routerReplaceMock).toHaveBeenCalledWith('/@rilog-team');
	});
});
