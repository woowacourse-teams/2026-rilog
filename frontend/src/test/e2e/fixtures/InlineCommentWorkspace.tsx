import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import { getPostCommentsDockHostId } from '@/widgets/post-detail/get-post-comments-dock-host-id';
import styles from '@/widgets/post-detail/PostDetail.module.css';
import PostDetailCommentsWorkspace from '@/widgets/post-detail/PostDetailCommentsWorkspace';

const root = document.getElementById('root');
if (root === null) throw new Error('인라인 댓글 브라우저 fixture 루트가 없습니다.');
const selectionIdParam = new URLSearchParams(window.location.search).get('selectionId');
const initialSelectionId = selectionIdParam === null ? null : Number(selectionIdParam);

createRoot(root).render(
	<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<LOGIN_MODAL_CONTEXT.Provider value={() => {}}>
				<div className="px-8 sm:ml-15">
					<div className={styles.postDetailShell}>
						<div className={styles.postDetailCard}>
							<div className={`${styles.contentLayout} px-5 sm:px-10`}>
								<aside className={styles.tableOfContentsColumn}>테스트 목차</aside>
								<PostDetailCommentsWorkspace
									html=""
									postId={106}
									initialSelectionId={initialSelectionId}
									ownerType="RILOG"
									category="TECH"
									enableInlineCommentSelectionDebug={false}
									profileSection={null}
								/>
							</div>
						</div>
						<aside id={getPostCommentsDockHostId(106)} className={styles.dockedCommentsHost} />
					</div>
				</div>
			</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>
	</QueryClientProvider>,
);
