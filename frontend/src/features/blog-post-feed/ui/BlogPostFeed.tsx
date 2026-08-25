'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import BlogPostList from '@/features/blog-post-feed/ui/BlogPostList';
import { deduplicatePostFeedItems } from '@/features/post-feed/lib/deduplicate-post-feed-items';
import Button from '@/shared/ui/button/Button';

import { usePublicBlogPosts } from '../hooks/use-public-blog-posts';

import BlogPostFeedSkeleton from './BlogPostFeedSkeleton';

interface BlogPostFeedProps {
	slug: string;
	initialRequestFailed?: boolean;
}

export default function BlogPostFeed({ slug, initialRequestFailed = false }: BlogPostFeedProps) {
	const [isQueryEnabled, setIsQueryEnabled] = useState(!initialRequestFailed);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const query = usePublicBlogPosts({ slug, isEnabled: isQueryEnabled });
	const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;

	const posts = useMemo(
		() => deduplicatePostFeedItems(query.data?.pages.flatMap((page) => page.items) ?? []),
		[query.data?.pages],
	);

	const hasInitialError = (!isQueryEnabled && initialRequestFailed) || (query.isError && posts.length === 0);

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
			<section aria-label="블로그 게시글 오류" className="min-w-0">
				<div className="flex min-h-32 flex-col items-center justify-center gap-5 text-center" role="alert">
					<p className="text-body-2 text-text-secondary">게시글 목록을 불러오지 못했어요.</p>
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
		return <BlogPostFeedSkeleton />;
	}

	return (
		<section aria-label="블로그 게시글" className="min-w-0">
			<BlogPostList posts={posts} slug={slug} />

			<div ref={sentinelRef} aria-hidden="true" className="h-px" />
			{(query.isFetchingNextPage || query.isFetchNextPageError) && (
				<div className="mt-8 flex min-h-10 items-center justify-center text-center" aria-live="polite">
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
