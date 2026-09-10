import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { POST_CATEGORY_OPTIONS } from '@/domains/post/model/post';
import { buildFeedFilterHref, type FeedSearchParams } from '@/features/post-feed/lib/feed-filter';
import PostFeedGrid from '@/features/post-feed/ui/PostFeedGrid';
import PostFeedSkeleton from '@/features/post-feed/ui/PostFeedSkeleton';
import { prefetchFullFeedPostsQuery } from '@/shared/api/feeds/queries/full-feed-posts/prefetch-query';
import { fullFeedPostsQueryOptions } from '@/shared/api/feeds/queries/full-feed-posts/query-options';
import type { FullFeedPostsFilters } from '@/shared/api/feeds/types';

const POST_FEED_CATEGORIES_ID = 'post-feed-categories';

const CATEGORIES = [{ label: '전체', value: undefined }, ...POST_CATEGORY_OPTIONS] as const;

interface PostFeedProps {
	filters: FullFeedPostsFilters;
	searchParams: FeedSearchParams;
}

async function PostFeedContent({ filters }: Pick<PostFeedProps, 'filters'>) {
	const queryClient = new QueryClient();
	const queryOptions = fullFeedPostsQueryOptions(filters);

	await prefetchFullFeedPostsQuery(queryClient, filters);

	const initialRequestFailed = queryClient.getQueryState(queryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PostFeedGrid {...filters} initialRequestFailed={initialRequestFailed} scrollTargetId={POST_FEED_CATEGORIES_ID} />
		</HydrationBoundary>
	);
}

export default function PostFeed({ filters, searchParams }: PostFeedProps) {
	const filterKey = `${filters.blogType ?? 'ALL'}:${filters.category ?? 'ALL'}`;

	return (
		<>
			<header className="flex min-h-72 items-center justify-center px-6 py-16 sm:min-h-96 md:py-24">
				<h1 className="sr-only">Rilog</h1>
				<Image
					src="/brand/logo.svg"
					alt=""
					width={629}
					height={250}
					priority
					className="h-auto w-[clamp(14rem,42vw,36rem)]"
				/>
			</header>
			<ul
				id={POST_FEED_CATEGORIES_ID}
				aria-label="게시글 카테고리"
				className="mx-auto mb-6 flex w-full max-w-7xl scroll-mt-20 gap-4 px-6 text-left text-body-1 sm:scroll-mt-8 md:px-16"
			>
				{CATEGORIES.map(({ label, value }) => {
					const isCurrent = filters.category === value;

					return (
						<li key={label}>
							<Link
								href={buildFeedFilterHref(searchParams, { category: value })}
								scroll={false}
								aria-current={isCurrent ? 'page' : undefined}
								className={isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary hover:text-focus-ring'}
							>
								{label}
							</Link>
						</li>
					);
				})}
			</ul>
			<div className="min-h-dvh">
				<Suspense key={filterKey} fallback={<PostFeedSkeleton />}>
					<PostFeedContent filters={filters} />
				</Suspense>
			</div>
		</>
	);
}
