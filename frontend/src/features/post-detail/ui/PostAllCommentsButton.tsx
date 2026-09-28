import CommentIcon from '@/shared/assets/icons/comment.svg';

import { formatCommentCount } from '../lib/format-comment-count';

interface PostAllCommentsButtonProps {
	commentCount: number;
	className?: string;
	onClick?: () => void;
}

export default function PostAllCommentsButton({ commentCount, className, onClick }: PostAllCommentsButtonProps) {
	return (
		<div className="flex justify-end border-b-2 border-border-strong bg-transparent pl-4 transition-colors">
			<button
				type="button"
				aria-label={`전체 댓글 ${commentCount}개 보기`}
				className={`group inline-flex items-center gap-1 px-1 pt-0.5 pb-1.5 text-label-2 font-semibold text-text-secondary hover:border-focus-ring hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${className ?? ''}`}
				onClick={onClick}
			>
				<CommentIcon aria-hidden="true" focusable="false" className="size-4 shrink-0" />
				<span>전체 보기</span>
				<span aria-hidden="true" className="text-text-tertiary transition-colors group-hover:text-focus-ring">
					{formatCommentCount(commentCount)}
				</span>
			</button>
		</div>
	);
}
