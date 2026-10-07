// TODO: 게시글 상세 API에 description 필드가 추가되면 다시 활성화한다.
// import { extractPostDescription } from '@/domains/post/lib/extract-post-description';
import type { ReactNode } from 'react';

import type { PostDetail } from '@/domains/post/model/post';
import { extractPostTableOfContents } from '@/features/post-detail/lib/extract-post-table-of-contents';
import { renderPostDetailContent } from '@/features/post-detail/lib/render-post-detail-content';
import PostDetailHero from '@/features/post-detail/ui/PostDetailHero';
import PostNavigationVisitProvider from '@/features/post-detail/ui/PostNavigationVisitProvider';
import PostTableOfContents from '@/features/post-detail/ui/PostTableOfContents';

import styles from './PostDetail.module.css';
import PostDetailCommentsWorkspace from './PostDetailCommentsWorkspace';

interface BasePostDetailProps {
	post: PostDetail;
	header: ReactNode;
	profileSection: ReactNode;
	beforeContent?: ReactNode;
	afterProfile?: ReactNode;
}

export default async function BasePostDetail({
	post,
	header,
	profileSection,
	beforeContent,
	afterProfile,
}: BasePostDetailProps) {
	const tableOfContents = extractPostTableOfContents(post.content);
	const contentHtml = await renderPostDetailContent(post.content);
	// const description = extractPostDescription(post.content, 150);

	return (
		<PostNavigationVisitProvider
			key={post.id}
			postId={post.id}
			ownerType={post.blog.type}
			chapterId={post.chapter?.id ?? null}
		>
			<main className="min-h-dvh bg-background px-2 py-2.5 sm:px-2.5 sm:py-3.5 lg:px-4 lg:py-5">
				<div
					className={`${styles.postDetailCard} mx-auto max-w-[105rem] rounded-xl border border-border-default bg-surface`}
				>
					{header}
					<PostDetailHero title={post.title} thumbnailUrl={post.thumbnailUrl} />
					{beforeContent}

					<div className={`${styles.contentLayout} px-2.5`}>
						{tableOfContents.length === 0 ? null : (
							<aside className={styles.tableOfContentsColumn}>
								<div className={styles.tableOfContentsSticky}>
									<PostTableOfContents items={tableOfContents} />
								</div>
							</aside>
						)}

						<PostDetailCommentsWorkspace
							html={contentHtml}
							postId={post.id}
							ownerType={post.blog.type}
							category={post.category}
							enableInlineCommentSelectionDebug={false}
							profileSection={profileSection}
							afterProfile={afterProfile}
						/>
					</div>
				</div>
			</main>
		</PostNavigationVisitProvider>
	);
}
