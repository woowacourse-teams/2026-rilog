import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import PostDetailCommentsWorkspace from '@/widgets/post-detail/PostDetailCommentsWorkspace';

const root = document.getElementById('root');
if (root === null) throw new Error('인라인 댓글 브라우저 fixture 루트가 없습니다.');

createRoot(root).render(
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<PostDetailCommentsWorkspace
				html=""
				postId={106}
				ownerType="RILOG"
				category="TECH"
				enableInlineCommentSelectionDebug={false}
				profileSection={null}
			/>
		</AUTH_CONTEXT.Provider>
	</QueryClientProvider>,
);
