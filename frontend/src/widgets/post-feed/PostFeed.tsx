import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Suspense } from 'react';

import PostFeedGrid from '@/features/post-feed/ui/PostFeedGrid';
import PostFeedSkeleton from '@/features/post-feed/ui/PostFeedSkeleton';

import { prefetchFullFeedPostsQuery } from '@/api/feeds/queries/full-feed-posts/prefetch-query';
import { fullFeedPostsQueryOptions } from '@/api/feeds/queries/full-feed-posts/query-options';

async function PostFeedContent() {
	const queryClient = new QueryClient();
	const queryOptions = fullFeedPostsQueryOptions();

	await prefetchFullFeedPostsQuery(queryClient);

	const initialRequestFailed = queryClient.getQueryState(queryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PostFeedGrid initialRequestFailed={initialRequestFailed} />
		</HydrationBoundary>
	);
}

export default function PostFeed() {
	return (
		<>
			<header className="flex min-h-72 items-center justify-center px-6 py-16 sm:min-h-96 md:py-24">
				<h1 className="sr-only">Rilog</h1>
				<Image
					src="/brand/logo.svg"
					alt=""
					width={629}
					height={237}
					priority
					className="h-auto w-[clamp(14rem,42vw,36rem)]"
				/>
			</header>
			<Suspense fallback={<PostFeedSkeleton />}>
				<PostFeedContent />
			</Suspense>
		</>
	);
}
