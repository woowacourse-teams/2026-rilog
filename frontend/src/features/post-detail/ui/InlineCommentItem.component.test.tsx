import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as postsApi from '@/shared/api/posts/api';
import { renderWithQuery as render } from '@/test/render-with-query';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentItem from './InlineCommentItem';

const COMMENT = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0].comments[0];

afterEach(() => vi.restoreAllMocks());

describe('InlineCommentItem', () => {
	it('삭제를 누르면 확인 모달을 열고 취소하면 댓글과 삭제 버튼 포커스를 유지한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canDelete: true }} />);
		const deleteButton = screen.getByRole('button', { name: '삭제' });
		await user.click(deleteButton);
		const dialog = screen.getByRole('dialog', { name: '댓글을 삭제할까요?' });
		expect(dialog).toHaveAccessibleDescription('삭제한 댓글은 복구할 수 없습니다.');
		expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus();
		expect(within(dialog).getByRole('button', { name: '삭제' })).toBeEnabled();
		await user.click(within(dialog).getByRole('button', { name: '취소' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(screen.getByText(COMMENT.content)).toBeInTheDocument();
		expect(deleteButton).toHaveFocus();
	});

	it('수정을 누르면 원문을 편집하고 취소하면 원문과 수정 버튼 포커스를 복원한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canEdit: true, canDelete: true }} />);
		await user.click(screen.getByRole('button', { name: '수정' }));
		const input = screen.getByRole('textbox', { name: '댓글 수정' });
		expect(input).toHaveValue(COMMENT.content);
		expect(input).toHaveFocus();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
		await user.clear(input);
		await user.type(input, '수정 내용{Enter}두 번째 줄');
		expect(input).toHaveValue('수정 내용\n두 번째 줄');
		expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
		await user.click(screen.getByRole('button', { name: '취소' }));
		expect(screen.queryByRole('textbox', { name: '댓글 수정' })).not.toBeInTheDocument();
		expect(screen.getByText(COMMENT.content)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '수정' })).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(screen.getByRole('textbox', { name: '댓글 수정' })).toHaveValue(COMMENT.content);
	});

	it.each([
		{ canEdit: true, canDelete: true },
		{ canEdit: true, canDelete: false },
		{ canEdit: false, canDelete: true },
		{ canEdit: false, canDelete: false },
	])('수정 권한=$canEdit, 삭제 권한=$canDelete이면 허용된 버튼만 표시한다', ({ canEdit, canDelete }) => {
		render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canEdit, canDelete }} />);
		if (canEdit) expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
		else expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		if (canDelete) expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
		else expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it.each([
		{ isAuthor: true, isBlogMember: true, badge: '작성자' },
		{ isAuthor: true, isBlogMember: false, badge: '작성자' },
		{ isAuthor: false, isBlogMember: true, badge: '멤버' },
		{ isAuthor: false, isBlogMember: false, badge: null },
	])('작성자=$isAuthor, 멤버=$isBlogMember이면 $badge 배지만 표시한다', ({ isAuthor, isBlogMember, badge }) => {
		render(
			<InlineCommentItem postId={81} comment={{ ...COMMENT, author: { ...COMMENT.author, isAuthor, isBlogMember } }} />,
		);
		for (const label of ['작성자', '멤버']) {
			if (label === badge) expect(screen.getByText(label)).toBeInTheDocument();
			else expect(screen.queryByText(label)).not.toBeInTheDocument();
		}
	});
});

it('저장 중에는 중복 제출을 막고 성공하면 수정 모드를 종료하고 포커스를 복원한다', async () => {
	const user = userEvent.setup();
	const pending = Promise.withResolvers<Awaited<ReturnType<typeof postsApi.updatePostCommentAnchor>>>();
	const update = vi.spyOn(postsApi, 'updatePostCommentAnchor').mockReturnValue(pending.promise);
	render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canEdit: true }} />);
	await user.click(screen.getByRole('button', { name: '수정' }));
	const input = screen.getByRole('textbox', { name: '댓글 수정' });
	await user.clear(input);
	expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
	await user.type(input, '변경 내용');
	await user.click(screen.getByRole('button', { name: '저장' }));
	const saving = screen.getByRole('button', { name: '저장 중…' });
	expect(saving).toHaveAttribute('aria-busy', 'true');
	expect(saving).toBeDisabled();
	expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
	await user.click(saving);
	expect(update).toHaveBeenCalledTimes(1);
	expect(update).toHaveBeenCalledWith(81, COMMENT.commentId, { content: '변경 내용' });
	await act(async () => {
		pending.resolve({
			status: 0,
			message: 'OK',
			data: {
				commentAnchorId: COMMENT.commentId,
				content: '변경 내용',
				isEdited: true,
				createdAt: COMMENT.createdAt,
				updatedAt: COMMENT.createdAt,
			},
		});
		await pending.promise;
	});
	await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
	expect(screen.getByRole('button', { name: '수정' })).toHaveFocus();
});

it('저장이 거절되면 입력과 수정 모드를 보존하고 alert 모달을 닫은 후 재시도할 수 있다', async () => {
	const user = userEvent.setup();
	const update = vi.spyOn(postsApi, 'updatePostCommentAnchor').mockRejectedValue(new Error('Forbidden'));
	render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canEdit: true }} />);
	await user.click(screen.getByRole('button', { name: '수정' }));
	const input = screen.getByRole('textbox', { name: '댓글 수정' });
	await user.clear(input);
	await user.type(input, '보존할 내용');
	await user.click(screen.getByRole('button', { name: '저장' }));
	const dialog = await screen.findByRole('alertdialog', { name: '댓글을 수정하지 못했습니다.' });
	expect(within(dialog).getByRole('button', { name: '확인' })).toHaveFocus();
	await user.click(within(dialog).getByRole('button', { name: '확인' }));
	await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
	expect(input).toHaveValue('보존할 내용');
	expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
	expect(screen.getByRole('button', { name: '저장' })).not.toHaveAttribute('aria-busy', 'true');
	await user.click(screen.getByRole('button', { name: '저장' }));
	expect(update).toHaveBeenCalledTimes(2);
});

it.each([true, false])('isEdited가 %s이면 서버의 편집 여부에 따라 편집됨을 표시한다', (isEdited) => {
	render(<InlineCommentItem postId={81} comment={{ ...COMMENT, isEdited }} />);
	if (isEdited) expect(screen.getByText('편집됨')).toBeInTheDocument();
	else expect(screen.queryByText('편집됨')).not.toBeInTheDocument();
});

it('삭제 요청 중 중복 제출과 모달 닫기를 막고 성공하면 확인 모달을 닫는다', async () => {
	const user = userEvent.setup();
	const pending = Promise.withResolvers<Awaited<ReturnType<typeof postsApi.deletePostCommentAnchor>>>();
	const remove = vi.spyOn(postsApi, 'deletePostCommentAnchor').mockReturnValue(pending.promise);
	render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canDelete: true }} />);
	await user.click(screen.getByRole('button', { name: '삭제' }));
	const dialog = screen.getByRole('dialog', { name: '댓글을 삭제할까요?' });
	await user.click(within(dialog).getByRole('button', { name: '삭제' }));
	const deleting = within(dialog).getByRole('button', { name: '삭제 중…' });
	expect(deleting).toBeDisabled();
	expect(deleting).toHaveAttribute('aria-busy', 'true');
	expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
	await user.click(deleting);
	await user.keyboard('{Escape}');
	expect(dialog).toBeInTheDocument();
	expect(remove).toHaveBeenCalledTimes(1);
	expect(remove).toHaveBeenCalledWith(81, COMMENT.commentId);
	await act(async () => {
		pending.resolve({ status: 0, message: 'OK', data: { commentAnchorId: COMMENT.commentId, selectionId: 91 } });
		await pending.promise;
	});
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('삭제에 실패하면 댓글을 보존하고 alert를 닫은 뒤 재시도할 수 있다', async () => {
	const user = userEvent.setup();
	const remove = vi.spyOn(postsApi, 'deletePostCommentAnchor').mockRejectedValue(new Error('Forbidden'));
	render(<InlineCommentItem postId={81} comment={{ ...COMMENT, canDelete: true }} />);
	await user.click(screen.getByRole('button', { name: '삭제' }));
	await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
	const alert = await screen.findByRole('alertdialog', { name: '댓글을 삭제하지 못했습니다.' });
	await user.click(within(alert).getByRole('button', { name: '확인' }));
	await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
	expect(screen.getByText(COMMENT.content)).toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: '삭제' }));
	await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }));
	expect(remove).toHaveBeenCalledTimes(2);
});
