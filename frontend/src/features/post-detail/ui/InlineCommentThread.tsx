import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import InlineCommentThreadContent from './InlineCommentThreadContent';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
	isCollapsible?: boolean;
}

export default function InlineCommentThread({ thread, onNavigate, isCollapsible = true }: InlineCommentThreadProps) {
	return (
		<InlineCommentThreadContent
			anchor={thread.anchor}
			isCollapsible={isCollapsible}
			onNavigate={() => onNavigate(thread)}
		/>
	);
}
