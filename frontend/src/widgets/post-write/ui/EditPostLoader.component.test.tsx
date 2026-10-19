import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT, type AuthContextValue } from '@/features/auth/model/auth-context';
import type { EditorDocument, PublicationSettings } from '@/features/post-write/model/post-publication';
import { readPostDetail } from '@/shared/api/posts/api';
import { readMyInfo } from '@/shared/api/users/api';
import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';
import { createTestQueryClient } from '@/test/render-with-query';

import PostWriteLoader from './PostWriteLoader';

const { routerBackMock, routerReplaceMock, navigationState } = vi.hoisted(() => ({
	navigationState: { searchParams: new URLSearchParams() },
	routerBackMock: vi.fn(),
	routerReplaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useSearchParams: () => navigationState.searchParams,
	useRouter: () => ({ back: routerBackMock, replace: routerReplaceMock }),
}));

vi.mock('@/shared/api/posts/api', () => ({ readPostDetail: vi.fn() }));
vi.mock('@/shared/api/users/api', () => ({ readMyInfo: vi.fn() }));

// BlockNote requires browser editor APIs; keep the loader, query and access guard real.
vi.mock('./EditPostController', () => ({
	default: ({
		initialDocument,
		initialPublicationSettings,
	}: {
		initialDocument: EditorDocument;
		initialPublicationSettings: PublicationSettings;
	}) => (
		<section aria-label="게시글 편집기">
			<label>
				제목
				<input defaultValue={initialDocument.title} />
			</label>
			<p>카테고리 {initialPublicationSettings.category}</p>
			<p>블로그 {initialPublicationSettings.blog?.slug}</p>
		</section>
	),
}));

const authenticatedSession: AuthContextValue = {
	isAuthenticated: true,
	isInitialized: true,
	isOnboarding: false,
	sessionVersion: 1,
};

const anonymousSession: AuthContextValue = {
	...authenticatedSession,
	isAuthenticated: false,
	sessionVersion: 2,
};

const postResponse = {
	status: 200,
	message: 'OK',
	data: createPostDetailResponseFixture({
		title: '수정할 제목',
		viewCount: 0,
		viewerPermissions: { canEdit: true, canDelete: true },
	}),
};

const queryClients: ReturnType<typeof createTestQueryClient>[] = [];

function renderEditLoader(session: AuthContextValue, queryString = 'postId=31&slug=author') {
	navigationState.searchParams = new URLSearchParams(queryString);
	const queryClient = createTestQueryClient();
	queryClients.push(queryClient);
	const content = (value: AuthContextValue) => (
		<QueryClientProvider client={queryClient}>
			<AUTH_CONTEXT.Provider value={value}>
				<PostWriteLoader />
			</AUTH_CONTEXT.Provider>
		</QueryClientProvider>
	);
	const rendered = render(content(session));
	return { setSession: (value: AuthContextValue) => rendered.rerender(content(value)) };
}

describe('EditPostLoader session access', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(readPostDetail).mockResolvedValue(postResponse);
		vi.mocked(readMyInfo).mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { id: 1, slug: 'author', nickname: '작성자', profileImageUrl: null },
		});
		Object.defineProperty(window.history, 'length', { configurable: true, value: 2 });
	});

	afterEach(() => {
		queryClients.splice(0).forEach((queryClient) => queryClient.clear());
	});

	it('로그인한 사용자가 정규화 후 빈 slug인 수정 URL로 진입하면 요청 없이 오류를 안내한다', () => {
		renderEditLoader(authenticatedSession, 'postId=42&slug=%40');

		expect(screen.getByRole('alert')).toHaveTextContent('올바르지 않은 게시글 ID입니다.');
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(readPostDetail).not.toHaveBeenCalled();
	});

	it('인코딩된 @ 접두사가 있는 수정 URL은 정규화한 slug로 편집기를 연다', async () => {
		renderEditLoader(authenticatedSession, 'postId=31&slug=%40author');

		expect(await screen.findByRole('textbox', { name: '제목' })).toHaveValue('수정할 제목');
		expect(readPostDetail).toHaveBeenCalledWith(
			{ slug: 'author', postId: 31 },
			expect.objectContaining({ cache: 'no-store' }),
		);
	});

	it.each([1, 2])('초기화된 게스트는 기록 길이 %i에서 상세 요청 없이 접근 가드로 이동한다', (historyLength) => {
		Object.defineProperty(window.history, 'length', { configurable: true, value: historyLength });

		renderEditLoader(anonymousSession);

		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
		expect(screen.queryByRole('region', { name: '게시글 편집기' })).not.toBeInTheDocument();
		expect(readPostDetail).not.toHaveBeenCalled();
		expect(readMyInfo).not.toHaveBeenCalled();
		if (historyLength > 1) {
			expect(routerBackMock).toHaveBeenCalledOnce();
			expect(routerReplaceMock).not.toHaveBeenCalled();
		} else {
			expect(routerReplaceMock).toHaveBeenCalledWith('/');
			expect(routerBackMock).not.toHaveBeenCalled();
		}
	});

	it('인증 초기화 중에는 요청과 이동을 보류하고 게스트로 확정되면 이동한다', () => {
		const { setSession } = renderEditLoader({ ...anonymousSession, isInitialized: false });

		expect(screen.getByRole('status')).toHaveTextContent('게시글 수정 권한을 확인하고 있어요.');
		expect(readPostDetail).not.toHaveBeenCalled();
		expect(readMyInfo).not.toHaveBeenCalled();
		expect(routerBackMock).not.toHaveBeenCalled();
		expect(routerReplaceMock).not.toHaveBeenCalled();

		setSession(anonymousSession);

		expect(routerBackMock).toHaveBeenCalledOnce();
		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
	});

	it('인증 초기화가 완료되면 실제 상세 응답을 편집기에 전달한다', async () => {
		const { setSession } = renderEditLoader({ ...anonymousSession, isInitialized: false });
		expect(readPostDetail).not.toHaveBeenCalled();

		setSession(authenticatedSession);

		expect(await screen.findByRole('textbox', { name: '제목' })).toHaveValue('수정할 제목');
		expect(screen.getByText('카테고리 TECH')).toBeInTheDocument();
		expect(screen.getByText('블로그 author')).toBeInTheDocument();
		expect(readPostDetail).toHaveBeenCalledWith(
			{ slug: 'author', postId: 31 },
			expect.objectContaining({ cache: 'no-store' }),
		);
		expect(vi.mocked(readPostDetail).mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
		expect(routerBackMock).not.toHaveBeenCalled();
		expect(routerReplaceMock).not.toHaveBeenCalled();
	});

	it('상세 요청 중 로그아웃하면 이동하고 늦은 응답도 편집기를 열지 않는다', async () => {
		let resolveDetail!: (response: typeof postResponse) => void;
		vi.mocked(readPostDetail).mockReturnValue(
			new Promise((resolve) => {
				resolveDetail = resolve;
			}),
		);
		const { setSession } = renderEditLoader(authenticatedSession);
		await waitFor(() => expect(readPostDetail).toHaveBeenCalledOnce());
		expect(screen.getByRole('status')).toHaveTextContent('게시글을 불러오고 있어요.');

		setSession(anonymousSession);

		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
		expect(routerBackMock).toHaveBeenCalledOnce();
		await act(() => Promise.resolve(resolveDetail(postResponse)));
		expect(screen.queryByRole('region', { name: '게시글 편집기' })).not.toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
		expect(readPostDetail).toHaveBeenCalledOnce();
	});

	it('편집기를 연 뒤 로그아웃하면 기존 편집기를 제거하고 이동한다', async () => {
		const { setSession } = renderEditLoader(authenticatedSession);
		expect(await screen.findByRole('textbox', { name: '제목' })).toHaveValue('수정할 제목');

		setSession(anonymousSession);

		expect(screen.queryByRole('region', { name: '게시글 편집기' })).not.toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('이전 페이지로 이동하고 있어요.');
		expect(routerBackMock).toHaveBeenCalledOnce();
		expect(readPostDetail).toHaveBeenCalledOnce();
	});
});
