import PostFeed from '@/widgets/post-feed/PostFeed';

export const dynamic = 'force-dynamic';

export default function FeedsPage() {
	return (
		<main className="min-h-screen">
			<PostFeed />
		</main>
	);
}
