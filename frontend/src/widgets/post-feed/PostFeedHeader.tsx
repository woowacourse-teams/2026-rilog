'use client';

import { useSearchParams } from 'next/navigation';

import type { BlogType } from '@/domains/blog/model/blog';
import { POST_CATEGORY_OPTIONS } from '@/domains/post/model/post';
import { analytics } from '@/features/analytics/model/events';
import { buildFeedFilterHref, parseFeedFilters } from '@/features/post-feed/lib/feed-filter';
import { navigateFeedFilter } from '@/features/post-feed/lib/navigate-feed-filter';
import OrderSelect from '@/features/post-feed/ui/OrderSelect';
import CustomLink from '@/shared/ui/link/CustomLink';

import { usePostFeedHeaderScroll } from './hooks/use-post-feed-header-scroll';

const CATEGORIES = [{ label: '전체', value: undefined }, ...POST_CATEGORY_OPTIONS] as const;

const TITLE_BY_BLOG_TYPE: Record<BlogType | 'ALL', string> = {
	ALL: 'All',
	RILOG: 'Personal',
	COLOG: 'Colog',
};

interface PostFeedHeaderProps {
	id: string;
}

export default function PostFeedHeader({ id }: PostFeedHeaderProps) {
	const searchParams = useSearchParams();
	const filters = parseFeedFilters(searchParams);
	const { headerRef, isHidden, isFilterScrolling } = usePostFeedHeaderScroll();
	const title = TITLE_BY_BLOG_TYPE[filters.blogType ?? 'ALL'];
	const order = filters.order ?? 'trending';

	return (
		<header
			ref={headerRef}
			id={id}
			aria-labelledby={`${id}-title`}
			className={`sticky top-16 z-30 mb-6 w-full bg-background ${isFilterScrolling ? 'transition-none' : 'transition-transform duration-200 ease-out'} motion-reduce:transition-none sm:top-0 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
		>
			<div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-6 pt-5 pb-3 sm:pt-6 sm:pb-4 md:px-16">
				<div className="flex items-center gap-1">
					<h2 id={`${id}-title`} className="shrink-0 text-title-3 font-semibold text-logo-primary">
						<span>{title}</span>
						<span className="text-logo-secondary">.</span>
					</h2>
					<OrderSelect value={order} />
				</div>

				<ul
					aria-label="게시글 카테고리"
					className="flex min-w-0 shrink justify-end gap-1.5 text-body-4 whitespace-nowrap sm:gap-4"
				>
					{CATEGORIES.map(({ label, value }) => {
						const href = buildFeedFilterHref(searchParams, { category: value });
						const isCurrent = filters.category === value;

						return (
							<li key={label} className="shrink-0">
								<CustomLink
									href={href}
									scroll={false}
									onClick={
										isCurrent ? undefined : () => analytics.feedCategoryFilterClicked({ category: value ?? 'ALL' })
									}
									onNavigate={(event) => {
										event.preventDefault();
										navigateFeedFilter(href);
									}}
									aria-current={isCurrent ? 'page' : undefined}
									className={`${isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary hover:text-focus-ring'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
								>
									{label}
								</CustomLink>
							</li>
						);
					})}
				</ul>
			</div>
			<div className="mx-auto w-full max-w-7xl px-6 md:px-16" aria-hidden="true">
				<div className="border-b border-border-strong" />
			</div>
		</header>
	);
}
