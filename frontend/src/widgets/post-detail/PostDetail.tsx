import { renderPostDetailContent } from '@/domains/post/lib/render-post-detail-content';
import type { PostDetail as PostDetailModel } from '@/domains/post/model/post-detail';
import PostDetailCoLogSummary from '@/domains/post/ui/PostDetailCoLogSummary';
import PostDetailContent from '@/domains/post/ui/PostDetailContent';
import PostDetailHeader from '@/domains/post/ui/PostDetailHeader';
import PostDetailHero from '@/domains/post/ui/PostDetailHero';
import { extractPostTableOfContents } from '@/features/post-detail/lib/extract-post-table-of-contents';
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
			<PostDetailHero title={post.title} thumbnailImageUrl={post.thumbnailImageUrl} />

			<div className="px-5 pb-32 sm:px-8">
				<div className="mx-auto max-w-2xl aside-right:-translate-x-8.75">
					<PostDetailHeader title={post.title} publishedAt={post.publishedAt} author={post.author} />
					{post.colog === null ? null : <PostDetailCoLogSummary colog={post.colog} />}
					<Divider aria-label="게시글 정보와 본문 구분" />

					<div className="relative mt-10">
						<PostDetailContent html={contentHtml} />
						{tableOfContents.length === 0 ? null : <PostTableOfContents items={tableOfContents} />}
					</div>
				</div>
			</div>
		</main>
	);
}
