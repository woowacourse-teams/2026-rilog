import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostViewerPermissions } from '@/domains/post/model/post';

import PostDetailActions from './PostDetailActions';

const {
	deletePostMutateMock,
	deletePostResetMock,
	routerPushMock,
	routerReplaceMock,
	useDeletePostMutationMock,
	usePostViewerPermissionsMock,
} = vi.hoisted(() => ({
	deletePostMutateMock: vi.fn(),
	deletePostResetMock: vi.fn(),
	routerPushMock: vi.fn(),
	routerReplaceMock: vi.fn(),
	useDeletePostMutationMock: vi.fn(),
	usePostViewerPermissionsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: routerPushMock, replace: routerReplaceMock }),
}));

vi.mock('@/shared/api/posts/mutations/use-delete-post-mutation', () => ({
	useDeletePostMutation: useDeletePostMutationMock,
}));
vi.mock('@/features/post-detail/hooks/use-post-viewer-permissions', () => ({
	usePostViewerPermissions: usePostViewerPermissionsMock,
}));

const ALL_PERMISSIONS = { canEdit: true, canDelete: true };

interface PostViewerPermissionsHookOptions {
	initialPermissions: PostViewerPermissions;
}

describe('PostDetailActions', () => {
	beforeEach(() => {
		deletePostMutateMock.mockReset();
		deletePostResetMock.mockReset();
		routerPushMock.mockReset();
		routerReplaceMock.mockReset();
		usePostViewerPermissionsMock.mockImplementation(
			({ initialPermissions }: PostViewerPermissionsHookOptions) => initialPermissions,
		);
		useDeletePostMutationMock.mockReturnValue({
			mutate: deletePostMutateMock,
			reset: deletePostResetMock,
			isPending: false,
			isError: false,
			error: null,
		});
	});

	it('수정과 삭제 권한이 있으면 두 버튼을 렌더링하고 수정 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PostDetailActions slug="rilog-team" postId={31} viewerPermissions={ALL_PERMISSIONS} />);

		await user.click(screen.getByRole('button', { name: '수정' }));

		expect(routerPushMock).toHaveBeenCalledWith('/write?postId=31');
		expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
	});

	it('수정과 삭제 권한이 모두 없으면 버튼을 렌더링하지 않는다', () => {
		render(
			<PostDetailActions slug="rilog-team" postId={31} viewerPermissions={{ canEdit: false, canDelete: false }} />,
		);

		expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it('클라이언트 상세 조회로 갱신된 권한을 버튼에 반영한다', () => {
		usePostViewerPermissionsMock.mockReturnValue(ALL_PERMISSIONS);

		render(
			<PostDetailActions slug="rilog-team" postId={31} viewerPermissions={{ canEdit: false, canDelete: false }} />,
		);

		expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
	});

	it.each([
		[{ canEdit: true, canDelete: false }, '수정', '삭제'],
		[{ canEdit: false, canDelete: true }, '삭제', '수정'],
	] as const)('%s만 허용되면 %s 버튼만 렌더링한다', (viewerPermissions, visibleName, hiddenName) => {
		render(<PostDetailActions slug="rilog-team" postId={31} viewerPermissions={viewerPermissions} />);

		expect(screen.getByRole('button', { name: visibleName })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: hiddenName })).not.toBeInTheDocument();
	});

	it('삭제 전에 복구할 수 없음을 안내하고 취소할 수 있다', async () => {
		const user = userEvent.setup();
		render(<PostDetailActions slug="rilog-team" postId={31} viewerPermissions={ALL_PERMISSIONS} />);

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
		render(<PostDetailActions slug="@rilog-team" postId={31} viewerPermissions={ALL_PERMISSIONS} />);

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
