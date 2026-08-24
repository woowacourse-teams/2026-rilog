import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostWriteAccessGuard from './PostWriteAccessGuard';

const { routerBackMock, routerReplaceMock, useAuthMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	routerBackMock: vi.fn(),
	routerReplaceMock: vi.fn(),
	useAuthMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: routerBackMock, replace: routerReplaceMock }),
}));

vi.mock('@/features/auth/model/use-auth', () => ({
	useAuth: useAuthMock,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

describe('PostWriteAccessGuard', () => {
	beforeEach(() => {
		routerBackMock.mockReset();
		routerReplaceMock.mockReset();
		useAuthMock.mockReset();
		useMyInfoQueryMock.mockReset();
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useMyInfoQueryMock.mockReturnValue({ isPending: false, isError: false, data: { data: { id: 7 } } });
		Object.defineProperty(window.history, 'length', { configurable: true, value: 2 });
	});

	it('접근자가 작성자이면 children을 렌더링한다', () => {
		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(screen.getByText('게시글 수정 화면')).toBeInTheDocument();
		expect(routerBackMock).not.toHaveBeenCalled();
	});

	it('접근자가 작성자가 아니면 children을 숨기고 이전 페이지로 돌아간다', () => {
		useMyInfoQueryMock.mockReturnValue({ isPending: false, isError: false, data: { data: { id: 8 } } });

		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
		expect(screen.queryByText('게시글 수정 화면')).not.toBeInTheDocument();
		expect(routerBackMock).toHaveBeenCalledOnce();
		expect(routerReplaceMock).not.toHaveBeenCalled();
	});

	it('이전 페이지가 없을 때 접근자가 작성자가 아니면 홈으로 이동한다', () => {
		useMyInfoQueryMock.mockReturnValue({ isPending: false, isError: false, data: { data: { id: 8 } } });
		Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });

		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(routerBackMock).not.toHaveBeenCalled();
		expect(routerReplaceMock).toHaveBeenCalledWith('/');
	});

	it('인증되지 않은 접근자는 내 정보를 조회하지 않고 이전 페이지로 돌아간다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: true });

		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(routerBackMock).toHaveBeenCalledOnce();
		expect(useMyInfoQueryMock).toHaveBeenCalledWith({ isEnabled: false });
		expect(screen.queryByText('게시글 수정 화면')).not.toBeInTheDocument();
	});

	it('인증이나 내 정보 확인 중에는 pending 상태를 보여 준다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: false });
		useMyInfoQueryMock.mockReturnValue({ isPending: true, isError: false, data: undefined });

		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(screen.getByRole('status')).toHaveTextContent('게시글 수정 권한을 확인하고 있어요.');
		expect(routerBackMock).not.toHaveBeenCalled();
	});

	it('내 정보 조회에 실패하면 오류를 안내한다', () => {
		useMyInfoQueryMock.mockReturnValue({ isPending: false, isError: true, data: undefined });

		render(
			<PostWriteAccessGuard authorId={7}>
				<p>게시글 수정 화면</p>
			</PostWriteAccessGuard>,
		);

		expect(screen.getByRole('alert')).toHaveTextContent('게시글 수정 권한을 확인하지 못했습니다.');
		expect(screen.queryByText('게시글 수정 화면')).not.toBeInTheDocument();
	});
});
