import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import { buildBlogHomeFilterHref } from '@/features/blog-home-index/lib/blog-home-filter';
import type { CologChapterPostSuggestions } from '@/features/post-detail/model/chapter';
import { MOCK_CHAPTER } from '@/features/post-detail/model/chapter.mock';
import PostFeedImage from '@/features/post-feed/ui/PostFeedImage';
import { buildBlogHomePath, buildPostDetailPath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface ChapterPostSuggestionSectionProps {
	slug: string;
	chapter?: CologChapterPostSuggestions;
}

const MAX_SUGGESTION_COUNT = 3;

export default function ChapterPostSuggestionSection({
	slug,
	chapter = MOCK_CHAPTER,
}: ChapterPostSuggestionSectionProps) {
	const posts = chapter.posts.slice(0, MAX_SUGGESTION_COUNT);

	if (posts.length === 0) {
		return null;
	}

	const chapterHref = buildBlogHomeFilterHref(
		buildBlogHomePath(slug),
		'',
		{ type: 'chapterId', chapterId: chapter.id },
		'COLOG',
	);

	return (
		<section aria-labelledby="chapter-post-suggestions-title" className="mt-20 pb-20 sm:mt-24">
			<h2 id="chapter-post-suggestions-title" className="text-body-2 font-semibold text-text-primary">
				<CustomLink
					href={chapterHref}
					className="transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
				>
					{chapter.name}
				</CustomLink>{' '}
				챕터의 더 많은 글
			</h2>

			<ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{posts.map((post) => (
					<li key={post.id} className="min-w-0">
						<article>
							<CustomLink
								href={buildPostDetailPath(slug, String(post.id))}
								className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
							>
								<div className="aspect-video overflow-hidden rounded-xl bg-thumbnail-background">
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
								<h3 className="mt-2 line-clamp-2 text-body-3 font-medium wrap-break-word break-keep text-text-primary transition-colors group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring motion-reduce:transition-none">
									{post.title}
								</h3>
							</CustomLink>
							<CustomLink
								href={buildBlogHomePath(post.author.slug)}
								className="mt-2 inline-block w-full truncate text-label-2 text-text-secondary transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							>
								{post.author.nickname}
							</CustomLink>
						</article>
					</li>
				))}
			</ul>
		</section>
	);
}
