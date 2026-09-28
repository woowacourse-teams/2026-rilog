'use client';

import { useRef, useState } from 'react';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import { analytics } from '@/features/analytics/model/events';
import type { InlineCommentModel } from '@/features/post-detail/model/inline-comment';
import { useDeletePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-delete-comment-anchor-mutation';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import AlertModal from '@/shared/ui/modal/AlertModal';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import { parseApiUtcDate, toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

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
	timeZone: 'Asia/Seoul',
});

const formatCommentDate = (createdAt: string) => {
	const date = parseApiUtcDate(createdAt);
	if (date === null) return createdAt;

	const dateParts = Object.fromEntries(
		COMMENT_DATE_FORMATTER.formatToParts(date).map(({ type, value }) => [type, value]),
	);

	return `${dateParts.year}.${dateParts.month}.${dateParts.day} ${dateParts.hour}:${dateParts.minute}`;
};

export default function InlineCommentItem({ comment, postId }: InlineCommentItemProps) {
	const { author } = comment;
	const authorBlogPath = buildBlogHomePath(author.slug);
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const deleteMutation = useDeletePostCommentAnchorMutation(postId, comment.commentId);
	const isDeleteResponseUnconfirmed = isInvalidApiResponseError(deleteMutation.error);
	const [isDeleteErrorOpen, setIsDeleteErrorOpen] = useState(false);
	const isDeleting = useRef(false);
	const handleDelete = async () => {
		if (!comment.canDelete || isDeleting.current) return;
		isDeleting.current = true;
		try {
			await deleteMutation.mutateAsync();
			analytics.inlineCommentDeleted({ postId });
			setIsDeleteModalOpen(false);
		} catch {
			setIsDeleteModalOpen(false);
			setIsDeleteErrorOpen(true);
		} finally {
			isDeleting.current = false;
		}
	};
	const editButtonRef = useRef<HTMLButtonElement>(null);

	return (
		<article
			aria-label={`${author.nickname}님의 댓글`}
			className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5"
		>
			<CustomLink
				href={authorBlogPath}
				aria-label={`${author.nickname}님의 블로그로 이동`}
				className="col-start-1 row-start-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
			>
				<UserAvatar
					fallback={author.nickname.slice(0, 1)}
					src={author.profileImageUrl}
					label={`${author.nickname}님의 프로필`}
					size="md"
				/>
			</CustomLink>
			<div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<CustomLink
						href={authorBlogPath}
						className="rounded-sm text-label-2 text-text-primary transition-colors hover:text-focus-ring hover:underline focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
					>
						<strong className="font-semibold">{author.nickname}</strong>
					</CustomLink>
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
						<time dateTime={toApiUtcISOString(comment.createdAt)}>{formatCommentDate(comment.createdAt)}</time>
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
					confirmLabel={deleteMutation.isPending ? '삭제 중…' : '삭제'}
					variant="danger"
					isPending={deleteMutation.isPending}
					onConfirm={() => void handleDelete()}
					onCancel={() => setIsDeleteModalOpen(false)}
				/>
			)}
			<AlertModal
				open={isDeleteErrorOpen}
				title={isDeleteResponseUnconfirmed ? '삭제 결과를 확인하지 못했습니다.' : '댓글을 삭제하지 못했습니다.'}
				description={
					isDeleteResponseUnconfirmed ? '댓글 목록에서 삭제 여부를 확인해 주세요.' : '잠시 후 다시 시도해 주세요.'
				}
				onAction={() => setIsDeleteErrorOpen(false)}
				onClose={() => setIsDeleteErrorOpen(false)}
			/>
		</article>
	);
}
