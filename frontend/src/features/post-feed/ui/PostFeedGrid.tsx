'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { PostFeedPage } from '@/domains/post/model/post-feed';
import PostFeedCard from '@/domains/post/ui/PostFeedCard';
import Button from '@/shared/ui/button/Button';

import { usePostFeedEntryAutoScroll } from '../hooks/use-post-feed-entry-auto-scroll';
import { deduplicatePostFeedItems } from '../lib/deduplicate-post-feed-items';
import { usePostFeed } from '../model/use-post-feed';

import PostFeedSkeleton from './PostFeedSkeleton';

interface PostFeedGridProps {
	initialPage?: PostFeedPage;
	initialRequestFailed?: boolean;
}

const POST_FEED_CONTENT_ID = 'post-feed-content';

export default function PostFeedGrid({ initialPage, initialRequestFailed = false }: PostFeedGridProps) {
	const [isQueryEnabled, setIsQueryEnabled] = useState(!initialRequestFailed);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const query = usePostFeed({ initialPage, isEnabled: isQueryEnabled });
	const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
	const posts = useMemo(
		() => deduplicatePostFeedItems(query.data?.pages.flatMap((page) => page.items) ?? []),
		[query.data?.pages],
	);
	const hasInitialError = (!isQueryEnabled && initialRequestFailed) || (query.isError && posts.length === 0);
	usePostFeedEntryAutoScroll({
		isReady: hasInitialError || !query.isPending,
		targetId: POST_FEED_CONTENT_ID,
	});

	useEffect(() => {
		const sentinel = sentinelRef.current;

		if (sentinel === null || !hasNextPage || isFetchingNextPage || isFetchNextPageError) {
			return;
		}

		let hasRequestedNextPage = false;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !hasRequestedNextPage) {
					hasRequestedNextPage = true;
					observer.disconnect();
					void fetchNextPage();
				}
			},
			{ rootMargin: '300px 0px' },
		);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

	if (hasInitialError) {
		return (
			<section
				id={POST_FEED_CONTENT_ID}
				className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 pb-20 md:px-16"
				aria-labelledby="post-feed-heading"
			>
				<h2 id="post-feed-heading" className="sr-only">
					최신 게시글
				</h2>
				<div className="flex min-h-64 flex-col items-center justify-center gap-5 text-center" role="alert">
					<p className="text-body-2 text-text-secondary">피드를 불러오지 못했어요.</p>
					<Button
						variant="secondary"
						onClick={() => {
							if (!isQueryEnabled) {
								setIsQueryEnabled(true);
								return;
							}

							void query.refetch();
						}}
					>
						다시 시도
					</Button>
				</div>
			</section>
		);
	}

	if (query.isPending) {
		return <PostFeedSkeleton />;
	}

	if (posts.length === 0) {
		return (
			<section
				id={POST_FEED_CONTENT_ID}
				className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 pb-20 md:px-16"
				aria-labelledby="post-feed-heading"
			>
				<h2 id="post-feed-heading" className="sr-only">
					최신 게시글
				</h2>
				<p
					className="flex min-h-64 items-center justify-center text-center text-body-2 text-text-secondary"
					role="status"
				>
					아직 발행된 게시글이 없어요.
				</p>
			</section>
		);
	}

	return (
		<section
			id={POST_FEED_CONTENT_ID}
			className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 pb-20 md:px-16"
			aria-labelledby="post-feed-heading"
		>
			<h2 id="post-feed-heading" className="sr-only">
				최신 게시글
			</h2>
			<ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{posts.map((post) => (
					<PostFeedCard key={post.id} post={post} />
				))}
			</ul>

			<div ref={sentinelRef} aria-hidden="true" className="h-px" />
			{(query.isFetchingNextPage || query.isFetchNextPageError) && (
				<div className="mt-10 flex min-h-10 items-center justify-center text-center" aria-live="polite">
					{query.isFetchingNextPage && <p className="text-body-1 text-text-secondary">게시글을 더 불러오는 중...</p>}
					{query.isFetchNextPageError && (
						<div className="flex flex-col items-center gap-3">
							<p className="text-body-1 text-text-secondary">다음 게시글을 불러오지 못했어요.</p>
							<Button variant="secondary" onClick={() => void query.fetchNextPage()}>
								다시 시도
							</Button>
						</div>
					)}
				</div>
			)}
		</section>
	);
}
