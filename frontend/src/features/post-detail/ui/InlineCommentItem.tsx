'use client';

import { useRef, useState } from 'react';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { InlineCommentModel } from '@/features/post-detail/model/inline-comment';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import InlineCommentEditForm from './InlineCommentEditForm';

interface InlineCommentItemProps {
	postId: number;
	comment: InlineCommentModel;
}

const COMMENT_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const formatCommentDate = (createdAt: string) => {
	const date = new Date(createdAt);
	if (Number.isNaN(date.getTime())) return createdAt;

	const dateParts = Object.fromEntries(
		COMMENT_DATE_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]),
	);

	return `${dateParts.year}.${dateParts.month}.${dateParts.day} ${dateParts.hour}:${dateParts.minute}`;
};

export default function InlineCommentItem({ comment, postId }: InlineCommentItemProps) {
	const { author } = comment;
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const editButtonRef = useRef<HTMLButtonElement>(null);

	return (
		<article
			aria-label={`${author.nickname}님의 댓글`}
			className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5"
		>
			<UserAvatar
				fallback={author.nickname.slice(0, 1)}
				src={author.profileImageUrl}
				label={`${author.nickname}님의 프로필`}
				size="md"
				className="col-start-1 row-start-1"
			/>
			<div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<strong className="text-label-2 font-semibold! text-text-primary">{author.nickname}</strong>
					{author.isAuthor ? (
						<span className="rounded-sm bg-focus-ring/15 px-1.5 text-caption-1 font-medium text-text-secondary">
							작성자
						</span>
					) : author.isBlogMember ? (
						<span className="rounded-sm bg-surface-active px-1.5 text-caption-1 font-medium text-text-secondary">
							멤버
						</span>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-1 text-label-1 text-text-placeholder">
					<span>
						<time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
					</span>
					{comment.isEdited && (
						<span className="flex items-center gap-1">
							<span aria-hidden="true">·</span>
							<span>편집됨</span>
						</span>
					)}
					{comment.canEdit && (
						<span className="flex items-center gap-1">
							<span aria-hidden="true">·</span>
							<button
								ref={editButtonRef}
								onClick={() => setIsEditing(true)}
								type="button"
								className="rounded-sm transition-colors hover:text-focus-ring focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:text-focus-ring"
							>
								수정
							</button>
						</span>
					)}
					{comment.canDelete && !isEditing && (
						<span className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setIsDeleteModalOpen(true)}
								className="rounded-sm transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							>
								삭제
							</button>
						</span>
					)}
				</div>
			</div>
			{isEditing && comment.canEdit ? (
				<div className="col-start-2 row-start-2 min-w-0">
					<InlineCommentEditForm
						postId={postId}
						commentAnchorId={comment.commentId}
						onSaved={() => {
							setIsEditing(false);
							editButtonRef.current?.focus();
						}}
						content={comment.content}
						onCancel={() => {
							setIsEditing(false);
							editButtonRef.current?.focus();
						}}
					/>
				</div>
			) : (
				<p className="col-start-2 row-start-2 text-body-1 leading-6 whitespace-pre-wrap text-text-secondary">
					{comment.content}
				</p>
			)}
			{comment.canDelete && (
				<ConfirmModal
					open={isDeleteModalOpen}
					title="댓글을 삭제할까요?"
					description="삭제한 댓글은 복구할 수 없습니다."
					confirmLabel="삭제"
					variant="danger"
					isConfirmDisabled
					onConfirm={() => {
						/* 삭제 API 연결 예정 */
					}}
					onCancel={() => setIsDeleteModalOpen(false)}
				/>
			)}
		</article>
	);
}
