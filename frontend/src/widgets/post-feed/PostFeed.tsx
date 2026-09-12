import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Suspense } from 'react';

import { POST_FEED_SCROLL_TARGET_ID } from '@/features/post-feed/lib/navigate-feed-filter';
import PostFeedGrid from '@/features/post-feed/ui/PostFeedGrid';
import PostFeedSkeleton from '@/features/post-feed/ui/PostFeedSkeleton';
import { prefetchFullFeedPostsQuery } from '@/shared/api/feeds/queries/full-feed-posts/prefetch-query';
import { fullFeedPostsQueryOptions } from '@/shared/api/feeds/queries/full-feed-posts/query-options';
import type { FullFeedPostsFilters } from '@/shared/api/feeds/types';

import PostFeedHeader from './PostFeedHeader';

const POST_FEED_CATEGORIES_ID = 'post-feed-categories';

interface PostFeedProps {
	filters: FullFeedPostsFilters;
}

async function PostFeedContent({ filters }: Pick<PostFeedProps, 'filters'>) {
	const queryClient = new QueryClient();
	const queryOptions = fullFeedPostsQueryOptions(filters);

	await prefetchFullFeedPostsQuery(queryClient, filters);

	const initialRequestFailed = queryClient.getQueryState(queryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PostFeedGrid
				initialFilters={filters}
				initialRequestFailed={initialRequestFailed}
				scrollTargetId={POST_FEED_SCROLL_TARGET_ID}
			/>
		</HydrationBoundary>
	);
}

export default function PostFeed({ filters }: PostFeedProps) {
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
			<div id={POST_FEED_SCROLL_TARGET_ID} aria-hidden="true" className="scroll-mt-20 sm:scroll-mt-8" />
			<PostFeedHeader id={POST_FEED_CATEGORIES_ID} />
			<div className="min-h-dvh">
				<Suspense fallback={<PostFeedSkeleton />}>
					<PostFeedContent filters={filters} />
				</Suspense>
			</div>
		</>
	);
}
