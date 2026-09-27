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
					<strong className="text-label-2 font-semibold text-text-primary">{author.nickname}</strong>
					{author.isAuthor ? (
						<span className="rounded-sm bg-surface-active px-1.5 text-label-1 text-text-secondary">작성자</span>
					) : null}
				</div>
				<time dateTime={comment.createdAt} className="text-label-1 text-text-placeholder">
					{formatCommentDate(comment.createdAt)}
				</time>
			</div>
			<p className="col-start-2 row-start-2 text-body-1 leading-6 whitespace-pre-wrap text-text-secondary">
				{comment.content}
			</p>
		</article>
	);
}
