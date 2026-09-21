import type { InlineCommentAnchorResponse } from '@/shared/api/posts/types';

interface InlineCommentQuoteProps {
	anchor: InlineCommentAnchorResponse;
}

export default function InlineCommentQuote({ anchor }: InlineCommentQuoteProps) {
	const isOutdated = anchor.state === 'OUTDATED';

	return (
		<div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1">
			{isOutdated && (
				<span className="w-fit shrink-0 rounded-full border border-border-strong px-2 py-0.5 text-label-1 font-medium text-text-placeholder">
					OUTDATED
				</span>
			)}
			<div className="text-body-1 leading-6">
				<span
					className={`box-decoration-clone px-1 py-0.5 transition-colors duration-200 motion-reduce:transition-none ${
						isOutdated ? 'bg-surface-hover text-text-placeholder' : 'bg-focus-ring/10 text-text-secondary'
					}`}
				>
					{anchor.selectedText}
				</span>
			</div>
		</div>
	);
}
