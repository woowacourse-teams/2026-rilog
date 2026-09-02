import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostViewerPermissions } from '@/domains/post/model/post';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { usePostViewerPermissions } from './use-post-viewer-permissions';

const { useAuthMock, usePostDetailQueryMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(),
	usePostDetailQueryMock: vi.fn(),
}));

vi.mock('@/features/auth/model/use-auth', () => ({ useAuth: useAuthMock }));
vi.mock('@/shared/api/posts/queries/post-detail/use-query', () => ({
	usePostDetailQuery: usePostDetailQueryMock,
}));

const INITIAL_PERMISSIONS = { canEdit: false, canDelete: false };

interface PostDetailQueryOptions {
	select: (response: ApiResponse<PostDetailResponse>) => PostViewerPermissions | undefined;
}

describe('usePostViewerPermissions', () => {
	beforeEach(() => {
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		usePostDetailQueryMock.mockReturnValue({ data: undefined });
	});

	it.each([
		{ isAuthenticated: false, isInitialized: false },
		{ isAuthenticated: false, isInitialized: true },
	])('인증된 사용자가 준비되기 전에는 상세 조회를 활성화하지 않는다', (authState) => {
		useAuthMock.mockReturnValue(authState);
		usePostDetailQueryMock.mockReturnValue({ data: { canEdit: true, canDelete: true } });

		const { result } = renderHook(() =>
			usePostViewerPermissions({ postId: 31, initialPermissions: INITIAL_PERMISSIONS }),
		);

		expect(usePostDetailQueryMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 31, isEnabled: false }));
		expect(result.current).toEqual(INITIAL_PERMISSIONS);
	});

	it('인증 초기화가 완료된 로그인 사용자는 클라이언트 상세 조회를 활성화한다', () => {
		renderHook(() => usePostViewerPermissions({ postId: 31, initialPermissions: INITIAL_PERMISSIONS }));

		expect(usePostDetailQueryMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 31, isEnabled: true }));
	});

	it('클라이언트 상세 응답의 viewerPermissions를 반환한다', () => {
		const clientPermissions = { canEdit: true, canDelete: true };
		usePostDetailQueryMock.mockImplementation(({ select }: PostDetailQueryOptions) => ({
			data: select({
				status: 200,
				message: 'OK',
				data: { viewerPermissions: clientPermissions } as PostDetailResponse,
			}),
		}));

		const { result } = renderHook(() =>
			usePostViewerPermissions({ postId: 31, initialPermissions: INITIAL_PERMISSIONS }),
		);

		expect(result.current).toEqual(clientPermissions);
	});

	it('클라이언트 응답이 아직 없으면 SSR 권한을 유지한다', () => {
		const { result } = renderHook(() =>
			usePostViewerPermissions({ postId: 31, initialPermissions: INITIAL_PERMISSIONS }),
		);

		expect(result.current).toEqual(INITIAL_PERMISSIONS);
	});
});
