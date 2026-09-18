import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

import PostDetailCommentsWorkspace from './PostDetailCommentsWorkspace';

vi.mock('@/features/post-detail/ui/PostDetailContent', () => ({
	default: ({ onInlineCommentOpen }: { onInlineCommentOpen: (request: unknown) => void }) => (
		<div>
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
	it('하이라이트 클릭 시 해당 인용 댓글 세트만 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));

		expect(screen.getByRole('dialog', { name: '댓글 1' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“첫 번째 인용” 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '“오래된 인용” 댓글' })).not.toBeInTheDocument();
	});

	it('블록 댓글 클릭 시 해당 블록의 인용 댓글 세트를 모두 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getByRole('button', { name: '블록 댓글 열기' }));

		expect(screen.getByRole('region', { name: '“첫 번째 인용” 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“오래된 인용” 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '“다른 블록 인용” 댓글' })).not.toBeInTheDocument();
	});

	it('전체 댓글 클릭 시 모든 블록의 인용 댓글 세트를 연다', async () => {
		const user = userEvent.setup();
		renderWorkspace();

		await user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);

		expect(screen.getByRole('dialog', { name: '댓글 3' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“첫 번째 인용” 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“오래된 인용” 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“다른 블록 인용” 댓글' })).toBeInTheDocument();
	});
});
