import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import { extractPostTableOfContents } from '@/features/post-detail/lib/extract-post-table-of-contents';
import { renderPostDetailContent } from '@/features/post-detail/lib/render-post-detail-content';
import PostDetailCoLogSummary from '@/features/post-detail/ui/PostDetailCoLogSummary';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import PostDetailHero from '@/features/post-detail/ui/PostDetailHero';
import PostTableOfContents from '@/features/post-detail/ui/PostTableOfContents';
import Divider from '@/shared/ui/divider/Divider';

interface PostDetailProps {
	post: PostDetailModel;
}

export default async function PostDetail({ post }: PostDetailProps) {
	const tableOfContents = extractPostTableOfContents(post.content);
	const contentHtml = await renderPostDetailContent(post.content);

	return (
		<main className="min-h-dvh bg-background">
			<PostDetailHero title={post.title} thumbnailUrl={post.thumbnailUrl} />

			<div className="px-5 sm:px-8">
				<div className="mx-auto max-w-2xl aside-right:-translate-x-8.75">
					<PostDetailHeader
						postId={post.id}
						slug={post.blog.slug}
						title={post.title}
						publishedAt={post.publishedAt}
						author={post.author}
						viewerPermissions={post.viewerPermissions}
					/>
					{post.blog.type === 'COLOG' ? <PostDetailCoLogSummary colog={post.blog} /> : null}
					<Divider aria-label="게시글 정보와 본문 구분" />

					<div className="relative mt-10">
						<PostDetailContent
							html={contentHtml}
							postId={post.id}
							ownerType={post.blog.type}
							category={post.category}
						/>
						{tableOfContents.length === 0 ? null : <PostTableOfContents items={tableOfContents} />}
					</div>
				</div>
			</div>
		</main>
	);
}
