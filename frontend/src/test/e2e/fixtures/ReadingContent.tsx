import { createRoot } from 'react-dom/client';

import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';

window.readingEvents = [];
const container = document.getElementById('root');
if (!container) throw new Error('읽기 브라우저 fixture root 누락');
const postId = Number(container.dataset.postId);
const articleHeight = Number(container.dataset.articleHeight);
createRoot(container).render(
	<PostDetailContent
		postId={postId}
		ownerType="RILOG"
		category="TECH"
		html={`<div style="height: ${articleHeight}px">글 ${postId}</div>`}
	/>,
);
