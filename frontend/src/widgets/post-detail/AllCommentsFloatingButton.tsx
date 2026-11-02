import type { Ref } from 'react';

import CommentIcon from '@/shared/assets/icons/comment.svg';
import Button from '@/shared/ui/button/Button';

interface AllCommentsFloatingButtonProps {
	ref?: Ref<HTMLButtonElement>;
	count: number;
	hidden: boolean;
	onClick: () => void;
}

export default function AllCommentsFloatingButton({ count, hidden, onClick, ref }: AllCommentsFloatingButtonProps) {
	return (
		<div hidden={hidden} className="fixed right-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40">
			<Button
				ref={ref}
				className="h-12! rounded-full! px-5! shadow-sm"
				aria-label={`전체 댓글 ${count}개 보기`}
				onClick={onClick}
			>
				<CommentIcon aria-hidden="true" focusable="false" className="size-5 shrink-0" />
				전체 댓글
			</Button>
		</div>
	);
}
