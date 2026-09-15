import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { prefetchBlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';
import { parseBlogRouteSlug } from '@/features/blog-profile/lib/parse-blog-route-slug';
import BlogHome from '@/widgets/blog-home/ui/BlogHome';

import { createBlogMetadata } from './metadata';

interface BlogHomePageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: BlogHomePageProps): Promise<Metadata> {
	const { slug: routeSlug } = await params;
	const slug = parseBlogRouteSlug(routeSlug);
	if (slug === null) notFound();
	const profileData = await getBlogPublicProfile(slug);
	if (profileData === null) notFound();

	return createBlogMetadata(profileData.profile);
}

export default async function BlogHomePage({ params, searchParams }: BlogHomePageProps) {
	const [{ slug: routeSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	const slug = parseBlogRouteSlug(routeSlug);
	if (slug === null) {
		notFound();
	}

	const profileData = await getBlogPublicProfile(slug);
	if (profileData === null) notFound();

	const queryClient = new QueryClient();
	const initialState = await prefetchBlogHomeInitialState(queryClient, {
		slug,
		searchParams: resolvedSearchParams,
		profileResponse: profileData.response,
	});

	if (initialState.status === 'not-found') {
		notFound();
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<BlogHome
				profile={initialState.profile}
				filter={initialState.filter}
				initialIndexRequestFailed={initialState.isInitialIndexRequestFailed}
				initialPostsRequestFailed={initialState.isInitialPostsRequestFailed}
			/>
		</HydrationBoundary>
	);
}
