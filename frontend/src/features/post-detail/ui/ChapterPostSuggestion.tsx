import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import BlogProfileEntryLink from '@/features/analytics/ui/BlogProfileEntryLink';
import { buildBlogHomeFilterHref } from '@/features/blog-home-index/lib/blog-home-filter';
import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';
import PostFeedImage from '@/features/post-feed/ui/PostFeedImage';
import { buildBlogHomePath, buildPostDetailPath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface ChapterPostSuggestionProps {
	slug: string;
	chapter: CologChapterPostSuggestions;
}

export default function ChapterPostSuggestion({ slug, chapter }: ChapterPostSuggestionProps) {
	const chapterHref = buildBlogHomeFilterHref(
		buildBlogHomePath(slug),
		'',
		{ type: 'chapterId', chapterId: chapter.id },
		'COLOG',
	);

	return (
		<section aria-labelledby="chapter-post-suggestions-title">
			<h2 id="chapter-post-suggestions-title" className="text-body-2 font-semibold text-text-primary">
				<BlogProfileEntryLink
					href={chapterHref}
					entrySource="post_detail_chapter_title"
					className="rounded-sm transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
				>
					{chapter.name}
				</BlogProfileEntryLink>{' '}
				챕터의 더 많은 글
			</h2>

			<ul className="mt-3 flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
				{chapter.posts.map((post) => (
					<li key={post.id} className="min-w-0">
						<article className="flex sm:flex-col">
							<CustomLink
								href={buildPostDetailPath(slug, String(post.id))}
								className="group/card h-full rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:rounded-xl sm:pb-2"
							>
								<div className="aspect-video h-19 shrink-0 overflow-hidden rounded-lg bg-thumbnail-background sm:h-auto sm:rounded-xl">
									<PostFeedImage
										src={post.thumbnailUrl}
										fallbackSrc={POST_THUMBNAIL_FALLBACK_URL}
										alt={`${post.title} 썸네일`}
										width={640}
										height={360}
										className="size-full object-cover"
										isScaledOnInteraction
									/>
								</div>
							</CustomLink>
							<div className="flex flex-col gap-2">
								<CustomLink
									href={buildPostDetailPath(slug, String(post.id))}
									className="line-clamp-2 flex-1 rounded-sm text-body-2 font-medium [overflow-wrap:anywhere] break-keep text-text-primary sm:text-body-3"
								>
									<h3 className="transition-colors hover:text-focus-ring focus-visible:text-focus-ring active:text-focus-ring motion-reduce:transition-none">
										{post.title}
									</h3>
								</CustomLink>
								<BlogProfileEntryLink
									href={buildBlogHomePath(post.author.slug)}
									entrySource="post_detail_recommendation_author"
									className="inline-block w-full truncate rounded-sm text-label-2 text-text-secondary transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
								>
									{post.author.nickname}
								</BlogProfileEntryLink>
							</div>
						</article>
					</li>
				))}
			</ul>
		</section>
	);
}
