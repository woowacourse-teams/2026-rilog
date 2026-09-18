import type { InlineCommentAnchorResponse } from '@/shared/api/posts/types';

interface InlineCommentQuoteProps {
	anchor: InlineCommentAnchorResponse;
	onNavigate: () => void;
}

export default function InlineCommentQuote({ anchor, onNavigate }: InlineCommentQuoteProps) {
	if (anchor.state === 'OUTDATED') {
		return (
			<div className="px-3 py-1.5" aria-label="오래된 인용">
				<span className="block text-label-1 font-semibold text-text-placeholder">OUTDATED</span>
				<span className="mt-1 bg-surface-hover box-decoration-clone px-1 py-0.5 text-body-1 leading-5 text-text-placeholder">
					{anchor.selectedText}
				</span>
			</div>
		);
	}

	return (
		<button
			type="button"
			aria-label={`인용문으로 이동: ${anchor.selectedText}`}
			className="group w-full px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
			onClick={onNavigate}
		>
			<span className="bg-focus-ring/10 box-decoration-clone px-1 py-0.5 text-body-1 leading-5 text-text-secondary transition-colors group-hover:bg-focus-ring/15">
				{anchor.selectedText}
			</span>
		</button>
	);
}
