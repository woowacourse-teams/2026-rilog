import type { Metadata } from 'next';

import AccessFeedback from '@/features/auth/ui/AccessFeedback';
import { PROXY_AUTH_REQUIRED_NOTICE, PROXY_NOTICE_QUERY_KEY } from '@/shared/api/proxy/constants';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import {
	createSocialMetadata,
	DEFAULT_OG_IMAGE,
	SITE_DESCRIPTION,
	SITE_NAME,
} from '@/shared/seo/create-social-metadata';
import PostFeed from '@/widgets/post-feed/PostFeed';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	alternates: { canonical: '/feeds' },
	title: { absolute: 'Rilog' },
	...createSocialMetadata({
		description: SITE_DESCRIPTION,
		image: DEFAULT_OG_IMAGE,
		title: SITE_NAME,
		type: 'website',
		url: '/feeds',
	}),
};

interface FeedsPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FeedsPage({ searchParams }: FeedsPageProps) {
	const query = await searchParams;
	const notice = query[PROXY_NOTICE_QUERY_KEY];
	const isAuthRequired = (Array.isArray(notice) ? notice[0] : notice) === PROXY_AUTH_REQUIRED_NOTICE;

	return (
		<main className="min-h-screen">
			<AccessFeedback isOpen={isAuthRequired} reason="auth-required" redirectPath={APP_ROUTES.feeds} />
			<PostFeed />
		</main>
	);
}
