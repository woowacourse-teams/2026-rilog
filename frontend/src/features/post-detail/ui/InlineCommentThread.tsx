import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function InlineCommentThread({ thread, onNavigate }: InlineCommentThreadProps) {
	return (
		<section aria-label={`“${thread.anchor.selectedText}” 댓글`}>
			<InlineCommentQuote anchor={thread.anchor} onNavigate={() => onNavigate(thread)} />
			{thread.anchor.comments.length === 0 ? (
				<p className="mt-8 pl-3 text-label-2 text-text-placeholder">아직 댓글이 없습니다.</p>
			) : (
				<ul className="mt-8 space-y-6 pl-3">
					{thread.anchor.comments.map((comment) => (
						<li key={comment.commentId}>
							<InlineCommentItem comment={comment} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
