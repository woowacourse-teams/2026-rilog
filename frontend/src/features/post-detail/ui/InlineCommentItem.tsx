import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { InlineCommentModel } from '@/features/post-detail/model/inline-comment';

interface InlineCommentItemProps {
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

export default function InlineCommentItem({ comment }: InlineCommentItemProps) {
	const { author } = comment;

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
					<span className="flex items-center gap-1">
						<span aria-hidden="true">·</span>
						<span>편집됨</span>
					</span>
					{comment.canEdit && (
						<span className="flex items-center gap-1">
							<span aria-hidden="true">·</span>
							<button
								type="button"
								className="rounded-sm transition-colors hover:text-focus-ring focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:text-focus-ring"
							>
								수정
							</button>
						</span>
					)}
					{comment.canDelete && (
						<span className="flex items-center gap-1">
							<button
								type="button"
								className="rounded-sm transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							>
								삭제
							</button>
						</span>
					)}
				</div>
			</div>
			<p className="col-start-2 row-start-2 text-body-1 leading-6 whitespace-pre-wrap text-text-secondary">
				{comment.content}
			</p>
		</article>
	);
}
