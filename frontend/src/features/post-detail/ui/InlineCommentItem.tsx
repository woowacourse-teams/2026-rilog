'use client';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { InlineCommentModel } from '@/features/post-detail/model/inline-comment';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

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
	const authorBlogPath = buildBlogHomePath(author.slug);

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
						<time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
					</span>
					{comment.isEdited && (
						<span className="flex items-center gap-1">
							<span aria-hidden="true">·</span>
							<span>편집됨</span>
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
