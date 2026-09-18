interface PostAllCommentsButtonProps {
	commentCount: number;
	className?: string;
	onClick?: () => void;
}

export default function PostAllCommentsButton({ commentCount, className, onClick }: PostAllCommentsButtonProps) {
	return (
		<div className="flex w-35 justify-end border-b-2 border-border-strong bg-transparent transition-colors">
			<button
				type="button"
				aria-label={`전체 댓글 ${commentCount}개 보기`}
				className={`group inline-flex items-center gap-1 px-1 pt-0.5 pb-1.5 text-label-2 font-semibold text-text-secondary hover:border-focus-ring hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${className ?? ''}`}
				onClick={onClick}
			>
				<span>전체 인라인 댓글</span>
				<span aria-hidden="true" className="text-text-tertiary transition-colors group-hover:text-focus-ring">
					{commentCount}
				</span>
			</button>
		</div>
	);
}
