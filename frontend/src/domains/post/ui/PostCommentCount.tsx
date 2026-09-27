import CommentIcon from '@/shared/assets/icons/comment.svg';

interface PostCommentCountProps {
	count: number;
}

export default function PostCommentCount({ count }: PostCommentCountProps) {
	return (
		<span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
			<CommentIcon className="size-4" aria-hidden="true" focusable="false" />
			<span aria-hidden="true">{count}</span>
			<span className="sr-only">댓글 {count}개</span>
		</span>
	);
}
