import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Suspense } from 'react';

import CologPostFeed from '@/features/colog-post-feed/ui/CologPostFeed';
import CologPostFeedSkeleton from '@/features/colog-post-feed/ui/CologPostFeedSkeleton';
import { prefetchPublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/prefetch-query';
import { publicBlogPostsQueryOptions } from '@/shared/api/blogs/queries/public-blog-posts/query-options';

interface CologPostListProps {
	slug: string;
}

async function CologPostListContent({ slug }: CologPostListProps) {
	const queryClient = new QueryClient();
	const postsQueryOptions = publicBlogPostsQueryOptions({ slug });

	await prefetchPublicBlogPostsQuery(queryClient, slug);

	const initialRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<CologPostFeed slug={slug} initialRequestFailed={initialRequestFailed} />
		</HydrationBoundary>
	);
}

export default function CologPostList({ slug }: CologPostListProps) {
	return (
		<Suspense fallback={<CologPostFeedSkeleton />}>
			<CologPostListContent slug={slug} />
		</Suspense>
	);
}
