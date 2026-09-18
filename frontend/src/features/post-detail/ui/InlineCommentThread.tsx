import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import Divider from '@/shared/ui/divider/Divider';

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
			<Divider className="mt-4 mb-6" />
			{thread.anchor.comments.length === 0 ? (
				<p className="pl-3 text-label-2 text-text-placeholder">아직 댓글이 없습니다.</p>
			) : (
				<ul className="space-y-6 pl-3">
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
