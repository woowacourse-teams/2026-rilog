import type { QueryClient } from '@tanstack/react-query';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import type { BlogHomeSearchParams } from '@/features/blog-home-index/lib/blog-home-filter';
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
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

interface PrefetchBlogHomeInitialStateOptions {
	slug: string;
	searchParams: BlogHomeSearchParams;
}

interface BlogHomeInitialNotFoundState {
	status: 'not-found';
}

interface BlogHomeInitialReadyState {
	status: 'ready';
	profile: BlogPublicProfile;
	filter: PublicBlogPostsFilter;
	postsFilter: PublicBlogPostsFilter;
	initialIndexRequestFailed: boolean;
	initialPostsRequestFailed: boolean;
}

export type BlogHomeInitialState = BlogHomeInitialNotFoundState | BlogHomeInitialReadyState;

export const prefetchBlogHomeInitialState = async (
	queryClient: QueryClient,
	{ slug, searchParams }: PrefetchBlogHomeInitialStateOptions,
): Promise<BlogHomeInitialState> => {
	const profileQueryOptions = blogPublicProfileQueryOptions(slug);
	const indexQueryOptions = blogIndexQueryOptions(slug);

	await Promise.all([prefetchBlogPublicProfileQuery(queryClient, slug), prefetchBlogIndexQuery(queryClient, slug)]);

	const profileResponse = queryClient.getQueryData(profileQueryOptions.queryKey);
	if (profileResponse?.data === undefined) {
		return { status: 'not-found' };
	}

	if (profileResponse.data.type !== 'COLOG' && profileResponse.data.type !== 'RILOG') {
		return { status: 'not-found' };
	}

	const profile = mapBlogPublicProfileResponse(profileResponse.data);
	const filter = parseBlogHomeFilter(searchParams, profile.type);
	if (filter === null) {
		return { status: 'not-found' };
	}

	const indexResponse = queryClient.getQueryData(indexQueryOptions.queryKey);
	const initialIndexRequestFailed = indexResponse?.data === undefined;
	let postsFilter = filter;

	if (indexResponse?.data !== undefined) {
		const index = mapBlogIndexResponse(indexResponse.data);
		if (!isBlogHomeFilterAvailable(filter, index, profile.type)) {
			return { status: 'not-found' };
		}
	} else {
		queryClient.removeQueries({ queryKey: indexQueryOptions.queryKey, exact: true });
		postsFilter = ALL_BLOG_POSTS_FILTER;
	}

	const postsQueryOptions = publicBlogPostsQueryOptions({ slug, filter: postsFilter });
	await prefetchPublicBlogPostsQuery(queryClient, slug, postsFilter);
	const initialPostsRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return {
		status: 'ready',
		profile,
		filter,
		postsFilter,
		initialIndexRequestFailed,
		initialPostsRequestFailed,
	};
};
