import AuthRequiredFeedback from '@/features/auth/ui/AuthRequiredFeedback';
import { PROXY_AUTH_REQUIRED_NOTICE, PROXY_NOTICE_QUERY_KEY } from '@/shared/api/proxy/constants';
import PostFeed from '@/widgets/post-feed/PostFeed';

export const dynamic = 'force-dynamic';

interface FeedsPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FeedsPage({ searchParams }: FeedsPageProps) {
	const query = await searchParams;
	const notice = query[PROXY_NOTICE_QUERY_KEY];
	const isAuthRequired = (Array.isArray(notice) ? notice[0] : notice) === PROXY_AUTH_REQUIRED_NOTICE;

	return (
		<main className="min-h-screen">
			<AuthRequiredFeedback isOpen={isAuthRequired} />
			<PostFeed />
		</main>
	);
}
