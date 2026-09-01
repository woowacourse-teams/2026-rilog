import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import {
	ALL_BLOG_POSTS_FILTER,
	isBlogHomeFilterAvailable,
	parseBlogHomeFilter,
} from '@/features/blog-home-index/lib/blog-home-filter';
import { mapBlogIndexResponse } from '@/features/blog-home-index/lib/map-blog-index-response';
import { mapBlogPublicProfileResponse } from '@/features/blog-profile/lib/map-blog-public-profile-response';
import { prefetchBlogIndexQuery } from '@/shared/api/blogs/queries/index/prefetch-query';
import { blogIndexQueryOptions } from '@/shared/api/blogs/queries/index/query-options';
import { prefetchPublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/prefetch-query';
import { publicBlogPostsQueryOptions } from '@/shared/api/blogs/queries/public-blog-posts/query-options';
import { prefetchBlogPublicProfileQuery } from '@/shared/api/blogs/queries/public-profile/prefetch-query';
import { blogPublicProfileQueryOptions } from '@/shared/api/blogs/queries/public-profile/query-options';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import BlogHome from '@/widgets/blog-home/ui/BlogHome';

interface BlogHomePageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BlogHomePage({ params, searchParams }: BlogHomePageProps) {
	const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);
	const queryClient = new QueryClient();
	const profileQueryOptions = blogPublicProfileQueryOptions(normalizedSlug);
	const indexQueryOptions = blogIndexQueryOptions(normalizedSlug);

	await Promise.all([
		prefetchBlogPublicProfileQuery(queryClient, normalizedSlug),
		prefetchBlogIndexQuery(queryClient, normalizedSlug),
	]);

	const profileResponse = queryClient.getQueryData(profileQueryOptions.queryKey);

	if (profileResponse?.data === undefined) {
		notFound();
	}

	if (profileResponse.data.type !== 'COLOG' && profileResponse.data.type !== 'RILOG') {
		notFound();
	}

	const profile = mapBlogPublicProfileResponse(profileResponse.data);
	const filter = parseBlogHomeFilter(resolvedSearchParams, profile.type);
	if (filter === null) {
		notFound();
	}

	const indexResponse = queryClient.getQueryData(indexQueryOptions.queryKey);
	const initialIndexRequestFailed = indexResponse?.data === undefined;
	let postsFilter = filter;

	if (indexResponse?.data !== undefined) {
		const index = mapBlogIndexResponse(indexResponse.data);
		if (!isBlogHomeFilterAvailable(filter, index, profile.type)) {
			notFound();
		}
	} else {
		queryClient.removeQueries({ queryKey: indexQueryOptions.queryKey, exact: true });
		postsFilter = ALL_BLOG_POSTS_FILTER;
	}

	const postsQueryOptions = publicBlogPostsQueryOptions({ slug: normalizedSlug, filter: postsFilter });
	await prefetchPublicBlogPostsQuery(queryClient, normalizedSlug, postsFilter);
	const initialPostsRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BlogHome
				profile={profile}
				filter={filter}
				postsFilter={postsFilter}
				initialIndexRequestFailed={initialIndexRequestFailed}
				initialPostsRequestFailed={initialPostsRequestFailed}
			/>
		</HydrationBoundary>
	);
}
