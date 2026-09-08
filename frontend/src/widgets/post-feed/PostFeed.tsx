import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Suspense } from 'react';

import PostFeedGrid from '@/features/post-feed/ui/PostFeedGrid';
import PostFeedSkeleton from '@/features/post-feed/ui/PostFeedSkeleton';
import { prefetchFullFeedPostsQuery } from '@/shared/api/feeds/queries/full-feed-posts/prefetch-query';
import { fullFeedPostsQueryOptions } from '@/shared/api/feeds/queries/full-feed-posts/query-options';

const POST_FEED_CATEGORIES_ID = 'post-feed-categories';

async function PostFeedContent() {
	const queryClient = new QueryClient();
	const queryOptions = fullFeedPostsQueryOptions();

	await prefetchFullFeedPostsQuery(queryClient);

	const initialRequestFailed = queryClient.getQueryState(queryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<PostFeedGrid initialRequestFailed={initialRequestFailed} scrollTargetId={POST_FEED_CATEGORIES_ID} />
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
				<li className="cursor-pointer font-semibold text-text-primary">전체</li>
				{['기술', '일상', '회고'].map((category) => (
					<li key={category} className="cursor-pointer text-text-secondary hover:text-focus-ring">
						{category}
					</li>
				))}
			</ul>
			<Suspense fallback={<PostFeedSkeleton />}>
				<PostFeedContent />
			</Suspense>
		</>
	);
}
