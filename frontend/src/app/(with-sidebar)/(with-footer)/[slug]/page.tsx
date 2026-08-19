import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { prefetchPublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/prefetch-query';
import { publicBlogPostsQueryOptions } from '@/shared/api/blogs/queries/public-blog-posts/query-options';
import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import PageShell from '@/shared/ui/page-shell/PageShell';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import { mapCologProfileResponse } from '@/widgets/colog-home/lib/map-colog-profile-response';
import { MOCK_COLOG_HOME_MEMBERS } from '@/widgets/colog-home/lib/mock-colog-home';
import CologHomeHero from '@/widgets/colog-home/ui/CologHomeHero';
import CologMemberList from '@/widgets/colog-home/ui/CologMemberList';
import CologPostList from '@/widgets/colog-home/ui/CologPostList';

interface CologHomePageProps {
	params: Promise<{ slug: string }>;
}

export default async function CologHomePage({ params }: CologHomePageProps) {
	const { slug } = await params;
	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);

	let profileResponse;

	try {
		profileResponse = await readBlogPublicProfile({ slug: normalizedSlug });
	} catch {
		notFound();
	}

	if (!profileResponse?.data) {
		notFound();
	}

	const profile = mapCologProfileResponse(profileResponse.data);

	const queryClient = new QueryClient();
	const postsQueryOptions = publicBlogPostsQueryOptions({ slug: normalizedSlug });

	await prefetchPublicBlogPostsQuery(queryClient, normalizedSlug);

	const postsRequestFailed = queryClient.getQueryState(postsQueryOptions.queryKey)?.status === 'error';

	return (
		<PageShell
			fullHeaderWidth
			header={<CologHomeHero profile={profile} />}
			rightAside={
				<div className="py-11">
					<CologMemberList members={MOCK_COLOG_HOME_MEMBERS} />
				</div>
			}
		>
			<div className="px-6 py-11 aside-right:px-0">
				<HydrationBoundary state={dehydrate(queryClient)}>
					<CologPostList slug={normalizedSlug} initialRequestFailed={postsRequestFailed} />
				</HydrationBoundary>
			</div>
		</PageShell>
	);
}
