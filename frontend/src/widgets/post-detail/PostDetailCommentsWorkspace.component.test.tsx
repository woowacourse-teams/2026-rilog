import { render as renderUI, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { InlineCommentSelectionTarget } from '@/features/post-detail/model/inline-comment-interaction';
import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

import PostDetailCommentsWorkspace from './PostDetailCommentsWorkspace';

vi.mock('@/features/post-detail/ui/PostDetailContent', () => ({
	default: ({
		onInlineCommentOpen,
		onInlineCommentCreate,
	}: {
		onInlineCommentOpen: (request: unknown) => void;
		onInlineCommentCreate: (selection: InlineCommentSelectionTarget) => void;
	}) => (
		<div>
			<button
				type="button"
				onClick={() =>
					onInlineCommentCreate({ blockId: 'block-1', startOffset: 4, endOffset: 8, selectedText: '새 인용' })
				}
			>
				새 인용 댓글 입력
			</button>
			<button
				type="button"
				onClick={() =>
					onInlineCommentCreate({ blockId: 'block-1', startOffset: 0, endOffset: 1, selectedText: '첫 번째 인용' })
				}
			>
				기존 인용 댓글 입력
			</button>
			<button
				type="button"
				onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1], source: 'highlight' })}
			>
				하이라이트 댓글 열기
			</button>
			<button
				type="button"
				onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1, 2], source: 'block' })}
			>
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
	updatedAt: '2026-09-17T10:20:00',
});

const BLOCKS: InlineCommentBlockResponse[] = [
	{
		blockId: 'block-1',
		anchors: [
			{
				anchorId: 1,
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '첫 번째 인용',
				state: 'ACTIVE',
				comments: [comment(1, '첫 댓글')],
			},
			{
				anchorId: 2,
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
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '다른 블록 인용',
				state: 'ACTIVE',
				comments: [comment(3, '셋째 댓글')],
			},
		],
	},
];

const render = (ui: ReactNode) =>
	renderUI(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			{ui}
		</AUTH_CONTEXT.Provider>,
	);

const renderWorkspace = () =>
	render(
		<PostDetailCommentsWorkspace
			html="<p>본문</p>"
			postId={81}
			ownerType="RILOG"
			category="TECH"
			inlineCommentBlocks={BLOCKS}
			enableInlineCommentSelectionDebug={false}
			profileSection={<div>프로필</div>}
		/>,
	);

describe('PostDetailCommentsWorkspace', () => {
	beforeEach(() => sessionStorage.clear());
	it('새 선택은 인용과 입력창을 바로 열고 초안을 다시 복원한다', async () => {
		const user = userEvent.setup();
		renderWorkspace();
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		expect(screen.getByRole('region', { name: '"새 인용" 댓글' })).toBeVisible();
		const input = screen.getByRole('textbox', { name: '댓글 입력' });
		expect(input).toHaveFocus();
		await user.type(input, '작성 중인 초안');
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('작성 중인 초안');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
	});

	it('같은 범위의 기존 앵커가 있으면 해당 스레드를 펼치고 입력창에 포커스한다', async () => {
		const user = userEvent.setup();
		renderWorkspace();
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeVisible();
		expect(screen.getByRole('article', { name: '댓글러 1님의 댓글' })).toHaveTextContent('첫 댓글');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"첫 번째 인용" 새 댓글' })).not.toBeInTheDocument();
	});

	it('백드롭으로 닫거나 다른 앵커 목록으로 전환해도 초안을 앵커별로 복원한다', async () => {
		const user = userEvent.setup();
		renderWorkspace();
		const openAll = () => user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);
		const firstRegion = () => within(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' }));
		const thirdRegion = () => within(screen.getByRole('region', { name: '"다른 블록 인용" 댓글' }));

		await openAll();
		await user.click(firstRegion().getByRole('button', { name: '댓글 펼치기' }));
		await user.type(firstRegion().getByRole('textbox', { name: '댓글 입력' }), '첫 초안{Enter}둘째 줄');
		await user.click(thirdRegion().getByRole('button', { name: '댓글 펼치기' }));
		await user.type(thirdRegion().getByRole('textbox', { name: '댓글 입력' }), '다른 앵커 초안');
		await user.click(screen.getByRole('dialog'));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));
		expect(firstRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('첫 초안\n둘째 줄');
		expect(screen.queryByRole('region', { name: '"다른 블록 인용" 댓글' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

		await openAll();
		await user.click(thirdRegion().getByRole('button', { name: '댓글 펼치기' }));
		expect(thirdRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('다른 앵커 초안');
		await user.clear(firstRegion().getByRole('textbox', { name: '댓글 입력' }));
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await openAll();
		expect(firstRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('');
		expect(thirdRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('다른 앵커 초안');
	});

	it('하이라이트 클릭 시 해당 인용 댓글 세트만 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));

		expect(screen.getByRole('dialog', { name: '인라인 댓글 1' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
		expect(screen.getByRole('article', { name: '댓글러 1님의 댓글' })).toBeVisible();
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeVisible();
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"오래된 인용" 댓글' })).not.toBeInTheDocument();
	});

	it('블록 댓글 클릭 시 해당 블록의 ACTIVE 인용 댓글만 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getByRole('button', { name: '블록 댓글 열기' }));
		expect(screen.getByRole('dialog', { name: '인라인 댓글 1' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '댓글 펼치기' })).toHaveLength(1);

		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"오래된 인용" 댓글' })).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"다른 블록 인용" 댓글' })).not.toBeInTheDocument();
	});

	it('전체 댓글 클릭 시 모든 블록의 인용 댓글 세트를 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);

		expect(screen.getByRole('dialog', { name: '전체 인라인 댓글 3' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '댓글 펼치기' })).toHaveLength(3);
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '"오래된 인용" 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '"다른 블록 인용" 댓글' })).toBeInTheDocument();
	});
});
