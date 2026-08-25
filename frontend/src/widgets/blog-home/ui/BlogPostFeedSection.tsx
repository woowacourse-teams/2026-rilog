import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Suspense } from 'react';

import BlogPostFeed from '@/features/blog-post-feed/ui/BlogPostFeed';
import BlogPostFeedSkeleton from '@/features/blog-post-feed/ui/BlogPostFeedSkeleton';
import { prefetchPublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/prefetch-query';
import { publicBlogPostsQueryOptions } from '@/shared/api/blogs/queries/public-blog-posts/query-options';

interface BlogPostFeedSectionProps {
	slug: string;
}

async function BlogPostFeedSectionContent({ slug }: BlogPostFeedSectionProps) {
	const queryClient = new QueryClient();
	const postsQueryOptions = publicBlogPostsQueryOptions({ slug });

	await prefetchPublicBlogPostsQuery(queryClient, slug);

	const initialRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BlogPostFeed slug={slug} initialRequestFailed={initialRequestFailed} />
		</HydrationBoundary>
	);
}

export default function BlogPostFeedSection({ slug }: BlogPostFeedSectionProps) {
	return (
		<Suspense fallback={<BlogPostFeedSkeleton />}>
			<BlogPostFeedSectionContent slug={slug} />
		</Suspense>
	);
}
