import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { prefetchBlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
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
	const initialState = await prefetchBlogHomeInitialState(queryClient, {
		slug: normalizedSlug,
		searchParams: resolvedSearchParams,
	});

	if (initialState.status === 'not-found') {
		notFound();
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BlogHome
				profile={initialState.profile}
				filter={initialState.filter}
				postsFilter={initialState.postsFilter}
				initialIndexRequestFailed={initialState.initialIndexRequestFailed}
				initialPostsRequestFailed={initialState.initialPostsRequestFailed}
			/>
		</HydrationBoundary>
	);
}
