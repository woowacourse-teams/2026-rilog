import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import { readPostCommentAnchors, readPostCommentAnchorsSidebar } from '@/shared/api/posts/api';
import { renderWithQuery } from '@/test/render-with-query';

import PostDetailCommentsWorkspace from './PostDetailCommentsWorkspace';

vi.mock('@/shared/api/posts/api', () => ({
	readPostCommentAnchors: vi.fn(),
	readPostCommentAnchorsSidebar: vi.fn(),
}));

vi.mock('@/features/post-detail/ui/PostDetailContent', () => ({
	default: ({ onInlineCommentOpen }: { onInlineCommentOpen: (request: unknown) => void }) => (
		<div>
			<button onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1], source: 'highlight' })}>
				하이라이트 댓글 열기
			</button>
			<button onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1, 2], source: 'block' })}>
				블록 댓글 열기
			</button>
		</div>
	),
}));

const comment = (commentId: number, content: string) => ({
	commentId,
	content,
	author: {
		userId: commentId,
		nickname: `댓글러 ${commentId}`,
		slug: `commenter-${commentId}`,
		profileImageUrl: null,
		isAuthor: false,
		isBlogMember: false,
	},
	canEdit: false,
	canDelete: false,
	createdAt: '2026-09-17T10:20:00',
	isEdited: false,
	updatedAt: '2026-09-17T10:20:00',
});

const BLOCKS: InlineCommentBlockModel[] = [
	{
		blockId: 'block-1',
		anchors: [
			{
				anchorId: 1,
				commentCount: 1,
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '첫 번째 인용',
				state: 'ACTIVE',
				comments: [comment(1, '첫 댓글')],
			},
			{
				anchorId: 2,
				commentCount: 1,
				range: { startOffset: 2, endOffset: 3 },
				selectedText: '오래된 인용',
				state: 'OUTDATED',
				comments: [comment(2, '둘째 댓글')],
			},
		],
	},
	{
		blockId: 'block-2',
		anchors: [
			{
				anchorId: 3,
				commentCount: 1,
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '다른 블록 인용',
				state: 'ACTIVE',
				comments: [comment(3, '셋째 댓글')],
			},
		],
	},
];

const render = (ui: ReactNode) =>
	renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<LOGIN_MODAL_CONTEXT.Provider value={vi.fn()}>{ui}</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>,
	);

const renderWorkspaceUI = (initialSelectionId?: number) =>
	render(
		<PostDetailCommentsWorkspace
			html="<p>본문</p>"
			postId={81}
			initialSelectionId={initialSelectionId}
			ownerType="RILOG"
			category="TECH"
			enableInlineCommentSelectionDebug={false}
			profileSection={<div>프로필</div>}
		/>,
	);

const RESPONSE = {
	status: 0,
	message: 'OK',
	data: {
		blocks: BLOCKS.map((block) => ({
			blockId: block.blockId,
			anchorGroups: block.anchors.map((anchor) => ({
				selectionId: anchor.anchorId,
				range: anchor.range,
				selectedText: anchor.selectedText,
				state: anchor.state === 'OUTDATED' ? ('ORPHANED' as const) : anchor.state,
				anchorCount: anchor.comments.length,
				commentAnchors: anchor.comments.map(({ commentId, author, ...commentData }) => ({
					...commentData,
					commentAnchorId: commentId,
					author: { ...author, isPostAuthor: author.isAuthor },
				})),
			})),
		})),
	},
};
const toSidebarResponse = (response: typeof RESPONSE) => ({
	...response,
	data: {
		anchorGroups: response.data.blocks.flatMap(({ blockId, anchorGroups }) =>
			anchorGroups.map((group) => ({ ...group, blockId })),
		),
	},
});
const renderWorkspace = async () => {
	const result = renderWorkspaceUI();
	await screen.findAllByRole('button', { name: '전체 댓글 3개 보기' });
	return result;
};

describe('PostDetailCommentsWorkspace', () => {
	it('초기 selection ID로 연 사이드바를 닫아도 URL을 변경하지 않는다', async () => {
		window.history.replaceState(null, '', '/@rilog/posts/81?selectionId=3&from=notification#quote');
		const user = userEvent.setup();
		renderWorkspaceUI(3);
		await screen.findByRole('dialog', { name: '인라인 댓글 1' });

		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));

		expect(window.location.pathname + window.location.search + window.location.hash).toBe(
			'/@rilog/posts/81?selectionId=3&from=notification#quote',
		);
	});

	it('하이라이트와 블록 클릭으로 사이드바를 열어도 URL을 변경하지 않는다', async () => {
		window.history.replaceState(null, '', '/@rilog/posts/81?from=notification');
		const user = userEvent.setup();
		renderWorkspaceUI();
		await screen.findAllByRole('button', { name: '전체 댓글 3개 보기' });
		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));
		expect(window.location.search).toBe('?from=notification');

		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await user.click(screen.getByRole('button', { name: '블록 댓글 열기' }));
		expect(window.location.search).toBe('?from=notification');
	});

	it('selection 링크로 진입하면 해당 인용 댓글만 열린다', async () => {
		renderWorkspaceUI(3);

		expect(await screen.findByRole('dialog', { name: '인라인 댓글 1' })).toBeVisible();
		expect(screen.getByRole('region', { name: '"다른 블록 인용" 댓글' })).toBeVisible();
		expect(screen.queryByRole('region', { name: '"첫 번째 인용" 댓글' })).not.toBeInTheDocument();
	});

	it('ACTIVE selection 링크로 진입하면 해당 본문 위치로 스크롤한다', async () => {
		window.history.replaceState(null, '', '/@rilog/posts/81?selectionId=1');
		const target = document.createElement('span');
		const scrollIntoView = vi.fn();
		target.dataset.inlineCommentAnchorId = '1';
		target.scrollIntoView = scrollIntoView;
		document.body.append(target);

		renderWorkspaceUI(1);

		expect(await screen.findByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeVisible();
		await waitFor(() => {
			expect(scrollIntoView).toHaveBeenCalledOnce();
			expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
		});
		target.remove();
	});

	it('OUTDATED selection 링크로 진입하면 본문을 스크롤하지 않는다', async () => {
		window.history.replaceState(null, '', '/@rilog/posts/81?selectionId=2');
		const target = document.createElement('span');
		const scrollIntoView = vi.fn();
		target.dataset.inlineCommentAnchorId = '2';
		target.scrollIntoView = scrollIntoView;
		document.body.append(target);

		renderWorkspaceUI(2);

		expect(await screen.findByRole('region', { name: '"오래된 인용" 댓글' })).toBeVisible();
		expect(screen.getByText('Outdated')).toBeVisible();
		expect(scrollIntoView).not.toHaveBeenCalled();
		target.remove();
	});

	it('존재하지 않는 selection 링크에서도 사이드바를 열고 빈 상태를 안내한다', async () => {
		renderWorkspaceUI(999);

		expect(await screen.findByRole('dialog')).toBeVisible();
		expect(await screen.findByText('표시할 댓글이 없습니다.')).toBeVisible();
	});

	it('사이드바 응답의 블록 간 순서를 그대로 렌더한다', async () => {
		const response = toSidebarResponse(RESPONSE);
		const [first, second, third] = response.data.anchorGroups;
		vi.mocked(readPostCommentAnchorsSidebar).mockResolvedValue({
			...response,
			data: { anchorGroups: [first, third, second] },
		});
		const user = userEvent.setup();
		await renderWorkspace();
		await user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);
		expect(screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual([
			'"첫 번째 인용" 댓글',
			'"다른 블록 인용" 댓글',
			'"오래된 인용" 댓글',
		]);
	});

	it('목록 로딩 중 열린 사이드바에 응답이 도착하면 댓글을 표시한다', async () => {
		let resolve!: (value: ReturnType<typeof toSidebarResponse>) => void;
		vi.mocked(readPostCommentAnchorsSidebar).mockReturnValue(
			new Promise((done) => {
				resolve = done;
			}),
		);
		const user = userEvent.setup();
		renderWorkspaceUI();
		await user.click(screen.getAllByRole('button', { name: /전체 댓글 \d+개 보기/ })[0]);
		expect(screen.getByRole('status')).toHaveTextContent('인라인 댓글을 불러오는 중');
		resolve(toSidebarResponse(RESPONSE));
		expect(await screen.findByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeVisible();
		expect(readPostCommentAnchorsSidebar).toHaveBeenCalledWith(81);
	});

	it('실패하면 재시도할 수 있고 빈 응답은 빈 목록으로 표시한다', async () => {
		vi.mocked(readPostCommentAnchorsSidebar)
			.mockRejectedValueOnce(new Error('실패'))
			.mockResolvedValueOnce({ status: 0, message: 'OK', data: { anchorGroups: [] } });
		const user = userEvent.setup();
		renderWorkspaceUI();
		await user.click(screen.getAllByRole('button', { name: /전체 댓글 \d+개 보기/ })[0]);
		expect(await screen.findByRole('alert')).toHaveTextContent('인라인 댓글을 불러오지 못했습니다.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(await screen.findByText('표시할 댓글이 없습니다.')).toBeVisible();
		expect(readPostCommentAnchorsSidebar).toHaveBeenCalledTimes(2);
	});

	beforeEach(() => {
		window.history.replaceState(null, '', '/');
		sessionStorage.clear();
		vi.mocked(readPostCommentAnchors).mockReset().mockResolvedValue(RESPONSE);
		vi.mocked(readPostCommentAnchorsSidebar).mockReset().mockResolvedValue(toSidebarResponse(RESPONSE));
	});
	afterEach(() => {
		window.history.replaceState(null, '', '/');
	});
	it('하이라이트 클릭 시 해당 인용 댓글 세트만 연다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();

		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));

		expect(screen.getByRole('dialog', { name: '인라인 댓글 1' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
		expect(screen.getByRole('article', { name: '댓글러 1님의 댓글' })).toBeVisible();
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeEnabled();
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"오래된 인용" 댓글' })).not.toBeInTheDocument();
	});

	it('블록 댓글 클릭 시 해당 블록의 ACTIVE 인용 댓글만 연다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();

		await user.click(screen.getByRole('button', { name: '블록 댓글 열기' }));
		expect(screen.getByRole('dialog', { name: '인라인 댓글 1' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '댓글 펼치기' })).toHaveLength(1);

		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"오래된 인용" 댓글' })).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"다른 블록 인용" 댓글' })).not.toBeInTheDocument();
	});

	it('전체 댓글 클릭 시 모든 블록의 인용 댓글 세트를 연다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();

		await user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);

		expect(screen.getByRole('dialog', { name: '전체 인라인 댓글 3' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '댓글 펼치기' })).toHaveLength(3);
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '"오래된 인용" 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '"다른 블록 인용" 댓글' })).toBeInTheDocument();
	});
});
