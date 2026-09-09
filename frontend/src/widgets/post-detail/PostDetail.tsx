// TODO: 게시글 상세 API에 description 필드가 추가되면 다시 활성화한다.
// import { extractPostDescription } from '@/domains/post/lib/extract-post-description';
import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import { extractPostTableOfContents } from '@/features/post-detail/lib/extract-post-table-of-contents';
import { renderPostDetailContent } from '@/features/post-detail/lib/render-post-detail-content';
import PostDetailAuthorProfileSmall from '@/features/post-detail/ui/PostDetailAuthorProfileSmall';
import PostDetailBlogProfile from '@/features/post-detail/ui/PostDetailBlogProfile';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import PostDetailHero from '@/features/post-detail/ui/PostDetailHero';
import PostTableOfContents from '@/features/post-detail/ui/PostTableOfContents';
import Divider from '@/shared/ui/divider/Divider';

import styles from './PostDetail.module.css';

interface PostDetailProps {
	post: PostDetailModel;
}

export default async function PostDetail({ post }: PostDetailProps) {
	const tableOfContents = extractPostTableOfContents(post.content);
	const contentHtml = await renderPostDetailContent(post.content);
	// const description = extractPostDescription(post.content, 150);
	const isCologPost = post.blog.type === 'COLOG';

	return (
		<main className="min-h-dvh bg-background px-4 py-5 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
			<div
				className={`${styles.postDetailCard} mx-auto max-w-[87.5rem] rounded-xl border border-border-default bg-surface`}
			>
				{/* TODO: description API 연동 후 PostDetailHeader에 description을 전달한다. */}
				<PostDetailHeader
					postId={post.id}
					slug={post.blog.slug}
					title={post.title}
					publishedAt={post.publishedAt}
					category={post.category}
					chapter={post.chapter}
					author={post.author}
					viewerPermissions={post.viewerPermissions}
				/>

				<PostDetailHero title={post.title} thumbnailUrl={post.thumbnailUrl} />

				<div className={`${styles.contentLayout} px-5 sm:px-10`}>
					<div className={`${styles.articleColumn} pt-4 pb-30 sm:pt-8 sm:pb-35`}>
						<PostDetailContent
							html={contentHtml}
							postId={post.id}
							ownerType={post.blog.type}
							category={post.category}
						/>
						<Divider className="mt-30 mb-20 sm:mt-40 sm:mb-30" />

						<div className="mx-auto max-w-lg">
							<PostDetailBlogProfile profile={post.blog} />
							{isCologPost ? (
								<div className="mx-auto mt-6 w-fit min-w-20 border-t border-border-default px-6 pt-6 sm:min-w-100">
									<PostDetailAuthorProfileSmall author={post.author} />
								</div>
							) : null}
						</div>
					</div>

					{tableOfContents.length === 0 ? null : (
						<aside className={styles.tableOfContentsColumn}>
							<div className={styles.tableOfContentsSticky}>
								<PostTableOfContents items={tableOfContents} />
							</div>
						</aside>
					)}
				</div>
			</div>
		</main>
	);
}
