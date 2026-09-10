import { Suspense } from 'react';

import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import { extractPostTableOfContents } from '@/features/post-detail/lib/extract-post-table-of-contents';
import { renderPostDetailContent } from '@/features/post-detail/lib/render-post-detail-content';
import ChapterPostSuggestionSection from '@/features/post-detail/ui/ChapterPostSuggestionSection';
import PostDetailCoLogSummary from '@/features/post-detail/ui/PostDetailCoLogSummary';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import PostDetailHero from '@/features/post-detail/ui/PostDetailHero';
import PostTableOfContents from '@/features/post-detail/ui/PostTableOfContents';
import SeriesAccordionSection from '@/features/post-detail/ui/SeriesAccordionSection';
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
					<div className="mt-10" />
					{post.blog.type === 'RILOG' && post.chapter !== null ? (
						<Suspense
							fallback={
								<div
									role="status"
									aria-label="시리즈 로딩 중"
									className="border-y border-border-strong px-5 py-3 text-body-3 text-text-secondary"
								>
									<div className="h-7 w-50 animate-pulse rounded bg-surface-active sm:w-100" />
								</div>
							}
						>
							<SeriesAccordionSection slug={post.blog.slug} postId={post.id} chapter={post.chapter} />
						</Suspense>
					) : null}

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

				<div className="mx-auto max-w-5xl">
					<ChapterPostSuggestionSection slug={post.blog.slug} />
				</div>
			</div>
		</main>
	);
}
