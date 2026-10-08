import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import styles from '@/widgets/post-detail/PostDetail.module.css';
import PostDetailCommentsWorkspace from '@/widgets/post-detail/PostDetailCommentsWorkspace';

const root = document.getElementById('root');
if (root === null) throw new Error('인라인 댓글 브라우저 fixture 루트가 없습니다.');

createRoot(root).render(
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<LOGIN_MODAL_CONTEXT.Provider value={() => {}}>
				<div className={styles.postDetailCard}>
					<div className={styles.contentLayout}>
						<PostDetailCommentsWorkspace
							html=""
							postId={106}
							ownerType="RILOG"
							category="TECH"
							enableInlineCommentSelectionDebug={false}
							profileSection={null}
						/>
					</div>
				</div>
			</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>
	</QueryClientProvider>,
);
