import { useState } from 'react';

import type { InlineCommentSelectionTarget } from '@/features/post-detail/model/inline-comment-interaction';
import InlineCommentSelectionToolbar from '@/features/post-detail/ui/InlineCommentSelectionToolbar';

// 본문 서버 렌더링·분석은 별도 검증한다. 브라우저 Selection과 실제 툴바는 그대로 연결한다.
export default function InlineCommentContent({
	onInlineCommentCreate,
}: {
	onInlineCommentCreate?: (selection: InlineCommentSelectionTarget) => void;
}) {
	const [article, setArticle] = useState<HTMLElement | null>(null);
	return (
		<>
			<article
				ref={setArticle}
				aria-label="게시글 본문"
				data-comment-selection-ready={Boolean(onInlineCommentCreate)}
				style={{ margin: '200px 80px', minHeight: '1500px' }}
			>
				<div className="bn-block-outer" data-id="block-1">
					<p data-inline-comment-root data-inline-comment-block-id="block-1">
						브라우저에서 선택하여 댓글을 작성하는 본문입니다.
					</p>
				</div>
			</article>
			{article && onInlineCommentCreate && (
				<InlineCommentSelectionToolbar article={article} onCreateComment={onInlineCommentCreate} />
			)}
		</>
	);
}
