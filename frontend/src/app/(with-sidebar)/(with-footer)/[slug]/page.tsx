import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { prefetchBlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import BlogHome from '@/widgets/blog-home/ui/BlogHome';

import { createBlogMetadata } from './metadata';

interface BlogHomePageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: BlogHomePageProps): Promise<Metadata> {
	const { slug } = await params;
	if (!hasBlogSlugPrefix(slug)) notFound();
	const profileData = await getBlogPublicProfile(stripAtPrefix(slug));
	if (profileData === null) notFound();

	return createBlogMetadata(profileData.profile);
}

export default async function BlogHomePage({ params, searchParams }: BlogHomePageProps) {
	const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);
	const profileData = await getBlogPublicProfile(normalizedSlug);
	if (profileData === null) notFound();

	const queryClient = new QueryClient();
	const initialState = await prefetchBlogHomeInitialState(queryClient, {
		slug: normalizedSlug,
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
