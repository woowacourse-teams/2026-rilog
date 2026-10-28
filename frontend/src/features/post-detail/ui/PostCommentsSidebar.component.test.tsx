import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';
import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { AuthContextValue } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import type * as PostsApi from '@/shared/api/posts/api';
import * as postsApi from '@/shared/api/posts/api';
import { addPostCommentAnchor, createPostCommentAnchor } from '@/shared/api/posts/api';
import { renderWithQuery } from '@/test/render-with-query';

import PostCommentsDockedCard from './PostCommentsDockedCard';
import PostCommentsSidebar from './PostCommentsSidebar';

vi.mock('@/shared/api/posts/api', async (importOriginal) => ({
	...(await importOriginal<typeof PostsApi>()),
	addPostCommentAnchor: vi.fn(),
	createPostCommentAnchor: vi.fn(),
}));

const withAuth = (
	ui: ReactNode,
	auth: AuthContextValue = { isAuthenticated: true, sessionVersion: 0, isInitialized: true, isOnboarding: false },
	login: (options?: { entrySurface?: 'sidebar' | 'mobile_header' }) => void = vi.fn(),
) => (
	<AUTH_CONTEXT.Provider value={auth}>
		<LOGIN_MODAL_CONTEXT.Provider value={login}>{ui}</LOGIN_MODAL_CONTEXT.Provider>
	</AUTH_CONTEXT.Provider>
);
const render = (
	ui: ReactNode,
	auth: AuthContextValue = { isAuthenticated: true, sessionVersion: 0, isInitialized: true, isOnboarding: false },
	login?: (options?: { entrySurface?: 'sidebar' | 'mobile_header' }) => void,
) => {
	const result = renderWithQuery(withAuth(ui, auth, login));
	return { ...result, rerender: (next: ReactNode) => result.rerender(withAuth(next, auth, login)) };
};

const THREADS: InlineCommentThreadModel[] = [
	{
		blockId: 'block-1',
		anchor: {
			anchorId: 1,
			commentCount: 1,
			range: { startOffset: 0, endOffset: 4 },
			selectedText: '활성 인용문',
			state: 'ACTIVE',
			comments: [
				{
					commentId: 1,
					content: '첫 번째 댓글',
					author: {
						userId: 1,
						nickname: '작성자',
						slug: 'author',
						profileImageUrl: null,
						isAuthor: true,
						isBlogMember: true,
					},
					isEdited: false,
					canEdit: true,
					canDelete: true,
					createdAt: '2026-09-17T10:20:00',
					updatedAt: '2026-09-17T10:20:00',
				},
			],
		},
	},
	{
		blockId: 'block-1',
		anchor: {
			anchorId: 2,
			commentCount: 1,
			range: { startOffset: 5, endOffset: 9 },
			selectedText: '오래된 인용문',
			state: 'OUTDATED',
			comments: [
				{
					commentId: 2,
					content: '두 번째 댓글',
					author: {
						userId: 2,
						nickname: '댓글러',
						slug: 'member',
						profileImageUrl: null,
						isAuthor: false,
						isBlogMember: true,
					},
					isEdited: false,
					canEdit: false,
					canDelete: false,
					createdAt: '2026-09-18T10:20:00',
					updatedAt: '2026-09-18T10:20:00',
				},
			],
		},
	},
];

describe('PostCommentsSidebar', () => {
	it('비로그인 사용자는 반복 입력 대신 하단 로그인 안내를 보고 로그인 모달을 연다', async () => {
		const user = userEvent.setup();
		const login = vi.fn();
		render(
			<PostCommentsSidebar mode="all" postId={81} open threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />,
			{ isAuthenticated: false, sessionVersion: 0, isInitialized: true, isOnboarding: false },
			login,
		);

		expect(screen.getByText('하고 인라인 댓글에 참여해 보세요.')).toBeInTheDocument();
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '로그인' }));
		expect(login).toHaveBeenCalledWith({ entrySurface: 'sidebar' });
	});

	it.each(['block', 'all'] as const)(
		'%s 목록은 인용이 하나여도 처음부터 펼쳐지고 접었다 다시 펼칠 수 있다',
		async (mode) => {
			const user = userEvent.setup();
			render(
				<PostCommentsSidebar
					mode={mode}
					postId={81}
					open
					threads={[THREADS[0]]}
					onClose={vi.fn()}
					onNavigate={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole('dialog', { name: `${mode === 'all' ? '전체 인라인 댓글' : '인라인 댓글'} 1` }),
			).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '댓글 접기' })).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: '댓글 접기' }));
			expect(screen.queryByRole('article', { name: '작성자님의 댓글' })).not.toBeInTheDocument();
			await user.click(screen.getByRole('button', { name: '댓글 펼치기' }));
			expect(screen.getByRole('article', { name: '작성자님의 댓글' })).toBeVisible();
		},
	);

	it('모든 인용의 댓글과 입력창을 처음부터 펼쳐 제공한다', () => {
		render(
			<PostCommentsSidebar mode="all" postId={81} open threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />,
		);

		expect(screen.getByRole('dialog', { name: '전체 인라인 댓글 2' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '"활성 인용문" 댓글' })).toBeInTheDocument();
		for (const button of screen.getAllByRole('button', { name: '댓글 접기' })) {
			expect(button).toHaveAttribute('aria-expanded', 'true');
		}
		expect(screen.getByRole('article', { name: '작성자님의 댓글' })).toHaveTextContent('첫 번째 댓글');
		expect(screen.getByText('작성자', { selector: 'span' })).toBeInTheDocument();
		expect(screen.getByText('멤버')).toBeInTheDocument();
		expect(screen.getAllByText('2026.09.17 19:20')).not.toHaveLength(0);
		expect(screen.getByText('Outdated')).toBeInTheDocument();
		expect(screen.getAllByRole('separator')).toHaveLength(2);
		expect(screen.getAllByRole('textbox', { name: '댓글 입력' })).toHaveLength(2);
		for (const input of screen.getAllByRole('textbox', { name: '댓글 입력' })) {
			expect(input).toHaveAttribute('placeholder', '댓글을 입력하세요.');
		}
	});

	it('인용은 버튼이 아니며 본문 이동과 닫기 동작을 전달한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onNavigate = vi.fn();
		render(
			<PostCommentsSidebar mode="all" postId={81} open threads={THREADS} onClose={onClose} onNavigate={onNavigate} />,
		);

		expect(screen.queryByRole('button', { name: '인용문으로 이동: 활성 인용문' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '인용문으로 이동: 오래된 인용문' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '본문으로 이동' }));
		expect(onNavigate).toHaveBeenCalledWith(THREADS[0]);

		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		const dialog = screen.getByRole('dialog', { name: '전체 인라인 댓글 2' });
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});
});

describe('PostCommentsSidebar 탐색 회귀', () => {
	it('단일 인용은 접기 버튼 없이 댓글을 보여주고 제목에 focus한다', async () => {
		render(
			<PostCommentsSidebar
				postId={81}
				open
				mode="single"
				threads={[THREADS[0]]}
				onClose={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);
		expect(await screen.findByRole('article', { name: '작성자님의 댓글' })).toHaveTextContent('첫 번째 댓글');
		expect(screen.queryByRole('button', { name: '댓글 펼치기' })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '인라인 댓글 1' })).toHaveFocus();
		expect(screen.getByRole('textbox')).toBeEnabled();
	});

	it('처음부터 OUTDATED 댓글을 읽을 수 있고 본문 이동은 ACTIVE에만 제공한다', async () => {
		const user = userEvent.setup();
		const onNavigate = vi.fn();
		const onClose = vi.fn();
		render(
			<PostCommentsSidebar postId={81} open mode="all" threads={THREADS} onClose={onClose} onNavigate={onNavigate} />,
		);
		expect(screen.getByText('Outdated')).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '본문으로 이동' })).toHaveLength(1);
		await user.click(screen.getByRole('button', { name: '본문으로 이동' }));
		expect(onNavigate).toHaveBeenCalledWith(THREADS[0]);
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('Escape로 닫은 뒤 열기 버튼의 focus를 복원한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const view = (open: boolean) => (
			<>
				<button>댓글 열기</button>
				<PostCommentsSidebar
					postId={81}
					open={open}
					mode="all"
					threads={THREADS}
					onClose={onClose}
					onNavigate={vi.fn()}
				/>
			</>
		);
		const { rerender } = render(view(false));
		await user.click(screen.getByRole('button', { name: '댓글 열기' }));
		rerender(view(true));
		fireEvent(screen.getByRole('dialog'), new Event('cancel'));
		expect(onClose).toHaveBeenCalledOnce();
		rerender(view(false));
		await waitFor(() => expect(screen.getByRole('button', { name: '댓글 열기' })).toHaveFocus());
	});
});

describe('모바일 댓글 바텀시트', () => {
	afterEach(() => vi.unstubAllGlobals());

	const renderMobileSheet = (onClose = vi.fn()) => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation(() => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
		render(
			<PostCommentsSidebar postId={81} open mode="all" threads={THREADS} onClose={onClose} onNavigate={vi.fn()} />,
		);
		return onClose;
	};

	it('손잡이는 키보드로 확장·축소하고 Escape로 닫으며 읽기 진입은 제목에 focus한다', async () => {
		const user = userEvent.setup();
		const onClose = renderMobileSheet();
		expect(screen.queryByRole('button', { name: '댓글 사이드바 닫기' })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '전체 인라인 댓글 2' })).toHaveFocus();
		const expand = screen.getByRole('button', { name: '댓글창 확장' });
		expand.focus();
		await user.keyboard('{Enter}');
		expect(screen.getByRole('button', { name: '댓글창 축소' })).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard('{Enter}');
		expect(screen.getByRole('button', { name: '댓글창 확장' })).toHaveAttribute('aria-expanded', 'false');
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('중첩 삭제 확인창의 내용을 드래그해도 댓글 시트는 움직이지 않는다', async () => {
		const user = userEvent.setup();
		const onClose = renderMobileSheet();
		await user.click(screen.getByRole('button', { name: '삭제' }));
		const confirmation = screen.getByRole('dialog', { name: '댓글을 삭제할까요?' });
		const message = within(confirmation).getByText('삭제한 댓글은 복구할 수 없습니다.');
		for (const [type, clientY] of [
			['pointerdown', 200],
			['pointermove', 320],
			['pointerup', 320],
		] as const) {
			const event = new Event(type, { bubbles: true, cancelable: true });
			Object.assign(event, { pointerId: 1, clientX: 100, clientY, button: 0, isPrimary: true });
			fireEvent(message, event);
		}
		expect(onClose).not.toHaveBeenCalled();
		expect(confirmation).toHaveAttribute('open');
	});

	it('브라우저가 이미 스크롤을 시작한 터치는 뒤늦게 시트 드래그로 가져오지 않는다', () => {
		const onClose = renderMobileSheet();
		const content = screen.getByText('첫 번째 댓글');
		for (const [type, clientY, cancelable] of [
			['touchstart', 200, true],
			['touchmove', 320, false],
			['touchend', 320, false],
		] as const) {
			const event = new Event(type, { bubbles: true, cancelable });
			const touch = { identifier: 1, clientX: 100, clientY };
			Object.assign(event, { touches: type === 'touchend' ? [] : [touch], changedTouches: [touch] });
			fireEvent(content, event);
		}
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '댓글창 확장' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('드래그로 닫은 직후 전달되는 클릭이 시트를 다시 확장하지 않는다', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn((query: string) => ({
				matches: query.includes('max-width'),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
		function ControlledSheet() {
			const [open, setOpen] = useState(true);
			return (
				<PostCommentsSidebar
					postId={81}
					open={open}
					mode="all"
					threads={THREADS}
					onClose={() => setOpen(false)}
					onNavigate={vi.fn()}
				/>
			);
		}
		render(<ControlledSheet />);
		const handle = screen.getByRole('button', { name: '댓글창 확장' });
		handle.setPointerCapture = vi.fn();
		for (const [type, clientY] of [
			['pointerdown', 200],
			['pointermove', 320],
			['pointerup', 320],
		] as const) {
			const event = new Event(type, { bubbles: true, cancelable: true });
			Object.assign(event, { pointerId: 1, clientX: 100, clientY, button: 0, isPrimary: true });
			fireEvent(handle, event);
		}
		fireEvent.click(handle);
		expect(handle).toHaveAttribute('aria-expanded', 'false');
	});
});

describe('모바일 하단 댓글 입력바', () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.mocked(addPostCommentAnchor)
			.mockReset()
			.mockResolvedValue({ status: 0, message: 'OK', data: { commentAnchorId: 901 } });
		vi.mocked(createPostCommentAnchor)
			.mockReset()
			.mockResolvedValue({ status: 0, message: 'OK', data: { commentAnchorId: 902 } });
		vi.stubGlobal(
			'matchMedia',
			vi.fn((query: string) => ({
				matches: query === '(max-width: 767px)',
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('새 선택은 인용문을 상단 댓글 영역에 유지하고 하단 단일 입력으로 해당 범위에 제출한다', async () => {
		const user = userEvent.setup();
		const selection = { blockId: 'new-block', startOffset: 2, endOffset: 7, selectedText: '새 인용문' };
		const onCreated = vi.fn();
		render(
			<PostCommentsSidebar
				postId={81}
				open
				mode="single"
				threads={[]}
				selection={selection}
				onCreated={onCreated}
				onClose={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);
		const footer = await screen.findByRole('region', { name: '댓글 작성 입력바' });
		const quoteRegion = screen.getByRole('region', { name: '"새 인용문" 댓글' });
		expect(within(quoteRegion).getByText('새 인용문')).toBeVisible();
		expect(footer).not.toContainElement(quoteRegion);
		expect(within(footer).queryByText('새 인용문')).not.toBeInTheDocument();
		expect(within(footer).queryByRole('blockquote')).not.toBeInTheDocument();
		expect(within(quoteRegion).queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		expect(screen.getAllByRole('textbox', { name: '댓글 입력' })).toHaveLength(1);
		const input = within(footer).getByRole('textbox', { name: '댓글 입력' });
		await waitFor(() => expect(input).toHaveFocus());
		await user.type(input, '새 영역에 남길 댓글');
		await user.click(within(footer).getByRole('button', { name: '작성' }));
		await waitFor(() =>
			expect(createPostCommentAnchor).toHaveBeenCalledWith(81, { ...selection, content: '새 영역에 남길 댓글' }),
		);
		expect(addPostCommentAnchor).not.toHaveBeenCalled();
		await waitFor(() => expect(onCreated).toHaveBeenCalledWith(902));
	});

	it('단일 인용을 읽으면 댓글 추가 버튼 없이 하단 입력을 표시한다', async () => {
		render(
			<PostCommentsSidebar
				postId={81}
				open
				mode="single"
				threads={[THREADS[0]]}
				onClose={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);
		const footer = await screen.findByRole('region', { name: '댓글 작성 입력바' });
		expect(within(footer).queryByText('활성 인용문')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '인라인 댓글 1' })).toHaveFocus();
		expect(screen.queryByRole('button', { name: '댓글 작성: 활성 인용문' })).not.toBeInTheDocument();
		expect(within(footer).getByRole('textbox', { name: '댓글 입력' })).toBeVisible();
	});

	it('전체 댓글은 답글을 고른 뒤 입력바를 열고 대상을 바꿔도 초안을 복원해 해당 인용으로 제출한다', async () => {
		const user = userEvent.setup();
		render(
			<PostCommentsSidebar postId={81} open mode="all" threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />,
		);
		expect(screen.queryByRole('region', { name: '댓글 작성 입력바' })).not.toBeInTheDocument();
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		const first = within(screen.getByRole('region', { name: '"활성 인용문" 댓글' }));
		const second = within(screen.getByRole('region', { name: '"오래된 인용문" 댓글' }));
		expect(screen.queryByRole('button', { name: '댓글 쓰기' })).not.toBeInTheDocument();
		expect(
			first
				.getByText('첫 번째 댓글')
				.compareDocumentPosition(first.getByRole('button', { name: '댓글 작성: 활성 인용문' })) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await user.click(first.getByRole('button', { name: '댓글 작성: 활성 인용문' }));
		const footer = await screen.findByRole('region', { name: '댓글 작성 입력바' });
		expect(screen.getAllByRole('textbox', { name: '댓글 입력' })).toHaveLength(1);
		expect(first.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		await user.type(within(footer).getByRole('textbox', { name: '댓글 입력' }), '첫 인용 초안');
		await user.click(second.getByRole('button', { name: '댓글 작성: 오래된 인용문' }));
		expect(second.getByRole('button', { name: '댓글 작성: 오래된 인용문' })).toHaveAttribute('aria-pressed', 'true');
		expect(first.getByRole('button', { name: '댓글 작성: 활성 인용문' })).toHaveAttribute('aria-pressed', 'false');
		expect(within(footer).getByLabelText('댓글 대상 인용문')).toHaveTextContent('오래된 인용문');
		await user.type(within(footer).getByRole('textbox', { name: '댓글 입력' }), '둘째 인용 초안');
		await user.click(first.getByRole('button', { name: '댓글 작성: 활성 인용문' }));
		expect(within(footer).getByRole('textbox', { name: '댓글 입력' })).toHaveValue('첫 인용 초안');
		await user.click(second.getByRole('button', { name: '댓글 작성: 오래된 인용문' }));
		expect(within(footer).getByRole('textbox', { name: '댓글 입력' })).toHaveValue('둘째 인용 초안');
		await user.click(within(footer).getByRole('button', { name: '작성' }));
		await waitFor(() => expect(addPostCommentAnchor).toHaveBeenCalledWith(81, 2, { content: '둘째 인용 초안' }));
		await waitFor(() => expect(screen.queryByRole('region', { name: '댓글 작성 입력바' })).not.toBeInTheDocument());
		expect(second.getByRole('button', { name: '댓글 작성: 오래된 인용문' })).toHaveAttribute('aria-pressed', 'false');
		await user.click(first.getByRole('button', { name: '댓글 작성: 활성 인용문' }));
		expect(
			within(await screen.findByRole('region', { name: '댓글 작성 입력바' })).getByRole('textbox', {
				name: '댓글 입력',
			}),
		).toHaveValue('첫 인용 초안');
		expect(createPostCommentAnchor).not.toHaveBeenCalled();
	});

	it('전체 댓글에서 인용이 하나면 버튼 없이 입력을 표시하고 재진입 후 초안을 유지한다', async () => {
		const user = userEvent.setup();
		const emptyThread = { ...THREADS[0], anchor: { ...THREADS[0].anchor, commentCount: 0, comments: [] } };
		const view = (open: boolean) => (
			<PostCommentsSidebar
				postId={81}
				open={open}
				mode="all"
				threads={[emptyThread]}
				onClose={vi.fn()}
				onNavigate={vi.fn()}
			/>
		);
		const result = render(view(true));
		expect(screen.getByText('아직 댓글이 없습니다.')).toBeVisible();
		expect(screen.queryByRole('button', { name: '댓글 작성: 활성 인용문' })).not.toBeInTheDocument();
		const input = await screen.findByRole('textbox', { name: '댓글 입력' });
		await user.type(input, '재진입 후에도 남길 초안');
		result.rerender(view(false));
		result.rerender(view(true));
		expect(await screen.findByRole('textbox', { name: '댓글 입력' })).toHaveValue('재진입 후에도 남길 초안');
	});

	it('기존 인용의 작성이 실패하면 하단 입력과 초안을 유지하고 오류를 표시한다', async () => {
		const user = userEvent.setup();
		vi.mocked(addPostCommentAnchor).mockRejectedValue(new Error('offline'));
		render(
			<PostCommentsSidebar
				postId={81}
				open
				mode="single"
				threads={[THREADS[0]]}
				onClose={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);
		const footer = await screen.findByRole('region', { name: '댓글 작성 입력바' });
		await user.type(within(footer).getByRole('textbox', { name: '댓글 입력' }), '실패해도 남길 초안');
		await user.click(within(footer).getByRole('button', { name: '작성' }));
		expect(await within(footer).findByRole('alert')).toHaveTextContent('댓글을 등록하지 못했습니다.');
		expect(within(footer).getByRole('textbox', { name: '댓글 입력' })).toHaveValue('실패해도 남길 초안');
		expect(within(footer).getByRole('button', { name: '작성' })).toBeEnabled();
	});
	it('접기 버튼은 작성 대상을 선택하거나 입력에 포커스하지 않고 인용문 선택과 독립적으로 동작한다', async () => {
		const user = userEvent.setup();
		render(
			<PostCommentsSidebar postId={81} open mode="all" threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />,
		);
		expect(screen.queryByRole('region', { name: '댓글 작성 입력바' })).not.toBeInTheDocument();
		const first = within(screen.getByRole('region', { name: '"활성 인용문" 댓글' }));
		const second = within(screen.getByRole('region', { name: '"오래된 인용문" 댓글' }));
		await user.click(first.getByRole('button', { name: '댓글 접기' }));
		expect(first.getByRole('button', { name: '댓글 펼치기' })).toHaveAttribute('aria-expanded', 'false');
		expect(first.queryByRole('button', { name: '댓글 작성: 활성 인용문' })).not.toBeInTheDocument();
		expect(screen.queryByRole('textbox', { name: '댓글 입력' })).not.toBeInTheDocument();
		await user.click(first.getByRole('button', { name: '댓글 펼치기' }));
		await user.click(first.getByRole('button', { name: '댓글 작성: 활성 인용문' }));
		const footer = await screen.findByRole('region', { name: '댓글 작성 입력바' });
		const input = within(footer).getByRole('textbox', { name: '댓글 입력' });
		await waitFor(() => expect(input).toHaveFocus());
		expect(first.getByRole('button', { name: '댓글 접기' })).toHaveAttribute('aria-expanded', 'true');
		await user.type(input, '첫 인용에 남길 초안');
		await user.click(second.getByRole('button', { name: '댓글 접기' }));
		expect(first.getByRole('button', { name: '댓글 작성: 활성 인용문' })).toHaveAttribute('aria-pressed', 'true');
		expect(second.queryByRole('button', { name: '댓글 작성: 오래된 인용문' })).not.toBeInTheDocument();
		expect(input).toHaveValue('첫 인용에 남길 초안');
		expect(input).not.toHaveFocus();
	});
});

describe.each([
	{ name: '댓글 모달', panel: PostCommentsSidebar },
	{ name: 'PC 도킹 댓글', panel: PostCommentsDockedCard },
])('$name 목록 스크롤', ({ panel }) => {
	it('재진입과 새 조회 요청만 맨 위로 돌아가고 갱신 위치와 작성 초안은 유지한다', async () => {
		const user = userEvent.setup();
		const view = (open: boolean, scrollResetKey = 0, threads = THREADS) =>
			createElement(panel, {
				postId: 981,
				open,
				mode: 'all',
				scrollResetKey,
				threads,
				onClose: vi.fn(),
				onNavigate: vi.fn(),
			});
		const { rerender } = render(view(true));
		const input = screen.getAllByRole('textbox', { name: '댓글 입력' })[0];
		await user.clear(input);
		await user.type(input, '보존할 댓글 초안');
		const list = input.closest('[data-comment-list]') as HTMLElement;
		list.scrollTop = 300;
		rerender(
			view(
				true,
				0,
				THREADS.map((thread) => ({ ...thread, anchor: { ...thread.anchor } })),
			),
		);
		expect(list.scrollTop).toBe(300);
		rerender(view(false));
		rerender(view(true));
		expect(list.scrollTop).toBe(0);
		expect(input).toHaveValue('보존할 댓글 초안');
		list.scrollTop = 200;
		rerender(view(true, 1));
		expect(list.scrollTop).toBe(0);
		expect(input).toHaveValue('보존할 댓글 초안');
	});
});

describe('댓글 패널의 하위 모달 수명주기', () => {
	afterEach(() => vi.restoreAllMocks());

	const view = (open: boolean) => (
		<PostCommentsSidebar postId={81} open={open} mode="all" threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />
	);

	it('부모 패널을 닫으면 삭제 확인창도 닫히고 다시 열어도 이전 확인창이 나타나지 않는다', async () => {
		const user = userEvent.setup();
		const { rerender } = render(view(true));
		await user.click(screen.getByRole('button', { name: '삭제' }));
		expect(screen.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeVisible();
		rerender(view(false));
		await waitFor(() => expect(document.querySelectorAll('dialog[open]')).toHaveLength(0));
		rerender(view(true));
		expect(screen.queryByRole('dialog', { name: '댓글을 삭제할까요?' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled();
	});

	it.each([false, true])(
		'패널을 닫은 수정 요청이 늦게 실패해도 오류창을 열지 않고 편집 초안을 보존한다 (응답 전 재진입=%s)',
		async (reopenBeforeFailure) => {
			const user = userEvent.setup();
			const pending = Promise.withResolvers<Awaited<ReturnType<typeof postsApi.updatePostCommentAnchor>>>();
			vi.spyOn(postsApi, 'updatePostCommentAnchor').mockReturnValue(pending.promise);
			const { rerender } = render(view(true));
			await user.click(screen.getByRole('button', { name: '수정' }));
			const input = screen.getByRole('textbox', { name: '댓글 수정' });
			await user.clear(input);
			await user.type(input, '보존할 수정 초안');
			await user.click(screen.getByRole('button', { name: '저장' }));
			rerender(view(false));
			await waitFor(() => expect(document.querySelectorAll('dialog[open]')).toHaveLength(0));
			if (reopenBeforeFailure) rerender(view(true));
			await act(async () => {
				pending.reject(new Error('offline'));
				await pending.promise.catch(() => undefined);
			});
			if (!reopenBeforeFailure) {
				await waitFor(() => expect(document.querySelectorAll('dialog[open]')).toHaveLength(0));
				rerender(view(true));
			}
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
			expect(screen.getByRole('textbox', { name: '댓글 수정' })).toHaveValue('보존할 수정 초안');
			await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
		},
	);

	it('부모 패널을 닫은 삭제 요청이 늦게 실패해도 오류창을 열지 않는다', async () => {
		const user = userEvent.setup();
		const pending = Promise.withResolvers<Awaited<ReturnType<typeof postsApi.deletePostCommentAnchor>>>();
		vi.spyOn(postsApi, 'deletePostCommentAnchor').mockReturnValue(pending.promise);
		const { rerender } = render(view(true));
		await user.click(screen.getByRole('button', { name: '삭제' }));
		await user.click(
			within(screen.getByRole('dialog', { name: '댓글을 삭제할까요?' })).getByRole('button', { name: '삭제' }),
		);
		rerender(view(false));
		await act(async () => {
			pending.reject(new Error('offline'));
			await pending.promise.catch(() => undefined);
		});
		await waitFor(() => expect(document.querySelectorAll('dialog[open]')).toHaveLength(0));
		rerender(view(true));
		expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
		expect(screen.getByText('첫 번째 댓글')).toBeVisible();
	});

	it('닫힌 댓글창의 수정이 늦게 성공해도 본문 포커스를 가져가지 않는다', async () => {
		const user = userEvent.setup();
		const pending = Promise.withResolvers<Awaited<ReturnType<typeof postsApi.updatePostCommentAnchor>>>();
		vi.spyOn(postsApi, 'updatePostCommentAnchor').mockReturnValue(pending.promise);
		const viewWithBodyAction = (open: boolean) => (
			<>
				<button>본문 동작</button>
				{view(open)}
			</>
		);
		const { rerender } = render(viewWithBodyAction(true));
		await user.click(screen.getByRole('button', { name: '수정' }));
		await user.click(screen.getByRole('button', { name: '저장' }));
		rerender(viewWithBodyAction(false));
		await waitFor(() => expect(document.querySelectorAll('dialog[open]')).toHaveLength(0));
		const bodyAction = screen.getByRole('button', { name: '본문 동작' });
		bodyAction.focus();
		await act(async () => {
			pending.resolve({
				status: 0,
				message: 'OK',
				data: {
					commentAnchorId: 1,
					content: '완료한 수정',
					isEdited: true,
					createdAt: '2026-09-17T10:20:00',
					updatedAt: '2026-09-17T10:20:00',
				},
			});
			await pending.promise;
		});
		expect(bodyAction).toHaveFocus();
		rerender(viewWithBodyAction(true));
		expect(screen.queryByRole('textbox', { name: '댓글 수정' })).not.toBeInTheDocument();
	});
});
