import type { RefObject } from 'react';

import Button from '@/shared/ui/button/Button';

interface InlineCommentSelectionActionProps {
	buttonRef?: RefObject<HTMLButtonElement | null>;
	expanded?: boolean;
	label?: string;
	onClick: () => void;
}

export default function InlineCommentSelectionAction({
	buttonRef,
	expanded = false,
	label = '댓글 추가',
	onClick,
}: InlineCommentSelectionActionProps) {
	return (
		<Button
			ref={buttonRef}
			size="icon"
			variant="ghost"
			aria-label={label}
			className={`group relative justify-start! overflow-hidden rounded-full! bg-brand-primary! text-white! shadow-modal focus-visible:outline-offset-2 ${
				expanded
					? 'h-11! w-28! gap-2! pl-3!'
					: 'h-7! w-7! pl-1.75! transition-[width]! duration-200 ease-out hover:w-22! focus-visible:w-22! motion-reduce:transition-none!'
			}`}
			onPointerDown={(event) => event.preventDefault()}
			onClick={onClick}
		>
			<svg
				aria-hidden="true"
				focusable="false"
				viewBox="0 0 20 20"
				className={`${expanded ? 'size-4.5' : 'size-3.5'} shrink-0`}
				fill="none"
			>
				<path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
			</svg>
			{expanded ? (
				<span className="text-label-1 whitespace-nowrap">{label}</span>
			) : (
				<span
					aria-hidden="true"
					className="absolute left-7 translate-x-1 text-label-2 whitespace-nowrap opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
				>
					{label}
				</span>
			)}
		</Button>
	);
}
