import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import PostCommentsSidebar from './PostCommentsSidebar';

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
					canEdit: true,
					canDelete: true,
					createdAt: '2026-09-17T10:20:00',
					isEdited: false,
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
					canEdit: false,
					canDelete: false,
					createdAt: '2026-09-18T10:20:00',
					isEdited: false,
					updatedAt: '2026-09-18T10:20:00',
				},
			],
		},
	},
];

describe('PostCommentsSidebar', () => {
	it('단일 인용은 접기 버튼 없이 댓글을 보여주고 제목에 focus한다', async () => {
		render(<PostCommentsSidebar open mode="single" threads={[THREADS[0]]} onClose={vi.fn()} onNavigate={vi.fn()} />);
		expect(await screen.findByRole('article', { name: '작성자님의 댓글' })).toHaveTextContent('첫 번째 댓글');
		expect(screen.queryByRole('button', { name: '댓글 펼치기' })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '인라인 댓글 1' })).toHaveFocus();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	});

	it('전체 목록을 펼쳐 OUTDATED를 읽되 본문 이동은 ACTIVE에만 제공한다', async () => {
		const user = userEvent.setup();
		const onNavigate = vi.fn();
		const onClose = vi.fn();
		render(<PostCommentsSidebar open mode="all" threads={THREADS} onClose={onClose} onNavigate={onNavigate} />);
		for (const button of screen.getAllByRole('button', { name: '댓글 펼치기' })) await user.click(button);
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
				<PostCommentsSidebar open={open} mode="all" threads={THREADS} onClose={onClose} onNavigate={vi.fn()} />
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
