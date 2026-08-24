import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostDetailActions from './PostDetailActions';

const { useAuthMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('@/features/auth/model/use-auth', () => ({
	useAuth: useAuthMock,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

describe('PostDetailActions', () => {
	beforeEach(() => {
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 7 } } });
	});

	it('로그인한 사용자가 작성자이면 수정과 삭제 버튼을 렌더링한다', () => {
		render(<PostDetailActions authorId={7} postId={31} />);

		expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
	});

	it('로그인한 사용자가 작성자가 아니면 수정과 삭제 버튼을 렌더링하지 않는다', () => {
		render(<PostDetailActions authorId={8} postId={31} />);

		expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it.each([
		{ isAuthenticated: false, isInitialized: true },
		{ isAuthenticated: false, isInitialized: false },
	])('인증되지 않았거나 인증 초기화 전이면 버튼을 렌더링하지 않는다', (authState) => {
		useAuthMock.mockReturnValue(authState);

		render(<PostDetailActions authorId={7} postId={31} />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
