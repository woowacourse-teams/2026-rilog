import { buildBlogHomeFilterHref } from '@/features/blog-home-index/lib/blog-home-filter';
import type { SeriesChapter } from '@/features/post-detail/model/series';
import ChevronIcon from '@/shared/assets/icons/chevron.svg';
import { buildBlogHomePath, buildPostDetailPath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import styles from './SeriesAccordion.module.css';

interface SeriesAccordionProps {
	slug: string;
	postId: number;
	series: SeriesChapter;
}

export default function SeriesAccordion({ slug, postId, series }: SeriesAccordionProps) {
	const { id, name, postCount, posts } = series;
	const seriesHref = buildBlogHomeFilterHref(
		buildBlogHomePath(slug),
		'',
		{ type: 'chapterId', chapterId: id },
		'RILOG',
	);

	return (
		<section
			aria-labelledby="series-accordion-title"
			className="mt-5 overflow-hidden border-y border-border-strong sm:mt-10"
		>
			<h2 id="series-accordion-title" className="sr-only">
				게시글 시리즈
			</h2>

			<details data-chapter-id={id} className={`group ${styles.accordion}`}>
				<summary className="flex list-none items-center justify-between gap-4 px-5 py-3 text-body-1 font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring sm:text-body-3 [&::-webkit-details-marker]:hidden">
					<span className="min-w-0">
						<CustomLink href={seriesHref} className="[overflow-wrap:anywhere] transition-colors hover:text-blue-600">
							{name}
						</CustomLink>
						<span className="ml-2 text-label-2 font-normal text-text-secondary">{postCount}</span>
					</span>
					<ChevronIcon className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
				</summary>

				<ol className="pt-1 pb-3">
					{posts.map((post, index) => {
						const isCurrentPost = post.id === postId;

						return (
							<li key={post.id}>
								<CustomLink
									href={buildPostDetailPath(slug, String(post.id))}
									className="group/link flex items-center gap-3 rounded-md px-2 py-2.5 text-label-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring sm:text-body-2"
								>
									<span
										aria-hidden="true"
										className="w-5 shrink-0 text-right text-label-1 text-text-placeholder sm:text-label-2"
									>
										{index + 1}
									</span>
									<span
										className={`[overflow-wrap:anywhere] transition-colors group-hover/link:text-blue-600 group-hover/link:underline group-hover/link:underline-offset-4 group-focus-visible/link:text-blue-600 group-active/link:text-blue-600 ${isCurrentPost ? 'font-medium text-text-primary' : 'text-text-placeholder'}`}
									>
										{post.title}
									</span>
								</CustomLink>
							</li>
						);
					})}
				</ol>
			</details>
		</section>
	);
}
