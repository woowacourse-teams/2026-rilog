import Image from 'next/image';
import { Suspense } from 'react';

import { fetchMockPostFeedPage } from '@/features/post-feed/model/post-feed.mock';
import PostFeedGrid from '@/features/post-feed/ui/PostFeedGrid';
import PostFeedSkeleton from '@/features/post-feed/ui/PostFeedSkeleton';

async function PostFeedContent() {
	// TODO(API 연동): 서버에서 실제 전체 피드 첫 페이지를 조회하도록 교체
	const initialPage = await fetchMockPostFeedPage(0).catch(() => null);

	return initialPage === null ? <PostFeedGrid initialRequestFailed /> : <PostFeedGrid initialPage={initialPage} />;
}

export default function PostFeed() {
	return (
		<>
			<header className="flex min-h-72 items-center justify-center px-6 py-16 sm:min-h-96 md:py-24">
				<h1 className="sr-only">Rilog</h1>
				<Image
					src="/brand/logo.svg"
					alt=""
					width={629}
					height={237}
					priority
					className="h-auto w-[clamp(14rem,42vw,36rem)]"
				/>
			</header>
			<Suspense fallback={<PostFeedSkeleton />}>
				<PostFeedContent />
			</Suspense>
		</>
	);
}
