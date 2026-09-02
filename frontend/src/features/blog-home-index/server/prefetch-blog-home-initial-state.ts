import type { QueryClient } from '@tanstack/react-query';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import type { BlogHomeSearchParams } from '@/features/blog-home-index/lib/blog-home-filter';
import { isBlogHomeFilterAvailable, parseBlogHomeFilter } from '@/features/blog-home-index/lib/blog-home-filter';
import { mapBlogIndexResponse } from '@/features/blog-home-index/lib/map-blog-index-response';
import { mapBlogPublicProfileResponse } from '@/features/blog-profile/lib/map-blog-public-profile-response';
import { prefetchBlogIndexQuery } from '@/shared/api/blogs/queries/index/prefetch-query';
import { blogIndexQueryOptions } from '@/shared/api/blogs/queries/index/query-options';
import { prefetchPublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/prefetch-query';
import { publicBlogPostsQueryOptions } from '@/shared/api/blogs/queries/public-blog-posts/query-options';
import { prefetchBlogPublicProfileQuery } from '@/shared/api/blogs/queries/public-profile/prefetch-query';
import { blogPublicProfileQueryOptions } from '@/shared/api/blogs/queries/public-profile/query-options';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

interface PrefetchBlogHomeInitialStateOptions {
	slug: string;
	searchParams: BlogHomeSearchParams;
	profileResponse?: ApiResponse<BlogPublicProfileResponse>;
}

interface BlogHomeInitialNotFoundState {
	status: 'not-found';
}

interface BlogHomeInitialReadyState {
	status: 'ready';
	profile: BlogPublicProfile;
	filter: PublicBlogPostsFilter;
	isInitialIndexRequestFailed: boolean;
	isInitialPostsRequestFailed: boolean;
}

export type BlogHomeInitialState = BlogHomeInitialNotFoundState | BlogHomeInitialReadyState;

export const prefetchBlogHomeInitialState = async (
	queryClient: QueryClient,
	{ slug, searchParams, profileResponse: initialProfileResponse }: PrefetchBlogHomeInitialStateOptions,
): Promise<BlogHomeInitialState> => {
	const profileQueryOptions = blogPublicProfileQueryOptions(slug);
	const indexQueryOptions = blogIndexQueryOptions(slug);

	if (initialProfileResponse !== undefined) {
		queryClient.setQueryData(profileQueryOptions.queryKey, initialProfileResponse);
		await prefetchBlogIndexQuery(queryClient, slug);
	} else {
		await Promise.all([prefetchBlogPublicProfileQuery(queryClient, slug), prefetchBlogIndexQuery(queryClient, slug)]);
	}

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
	const isInitialIndexRequestFailed = indexResponse?.data === undefined;

	if (indexResponse?.data !== undefined) {
		const index = mapBlogIndexResponse(indexResponse.data);
		if (!isBlogHomeFilterAvailable(filter, index, profile.type)) {
			return { status: 'not-found' };
		}
	} else {
		queryClient.removeQueries({ queryKey: indexQueryOptions.queryKey, exact: true });
	}

	const postsQueryOptions = publicBlogPostsQueryOptions({ slug, filter });
	await prefetchPublicBlogPostsQuery(queryClient, slug, filter);
	const isInitialPostsRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return {
		status: 'ready',
		profile,
		filter,
		isInitialIndexRequestFailed,
		isInitialPostsRequestFailed,
	};
};
