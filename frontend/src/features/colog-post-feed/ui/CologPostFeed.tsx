'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { deduplicatePostFeedItems } from '@/features/post-feed/lib/deduplicate-post-feed-items';
import PostFeedImage from '@/features/post-feed/ui/PostFeedImage';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

import { usePublicBlogPosts } from '../hooks/use-public-blog-posts';

import CologPostFeedSkeleton from './CologPostFeedSkeleton';

interface CologPostFeedProps {
	slug: string;
	initialRequestFailed?: boolean;
}

export default function CologPostFeed({ slug, initialRequestFailed = false }: CologPostFeedProps) {
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
			<section aria-label="코로그 게시글 에러" className="min-w-0">
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
		return <CologPostFeedSkeleton />;
	}

	return (
		<section aria-label="코로그 게시글" className="min-w-0">
			{posts.length === 0 ? (
				<p className="text-body-2 text-text-secondary">아직 작성된 게시글이 없습니다.</p>
			) : (
				<ul className="flex flex-col gap-7">
					{posts.map((post) => (
						<li key={post.id}>
							<CustomLink
								href={buildPostDetailPath(slug, String(post.id))}
								className="group flex gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
							>
								<div className="relative aspect-3/2 h-24 shrink-0 overflow-hidden rounded-lg bg-surface-hover sm:h-27">
									<PostFeedImage
										src={post.thumbnailUrl}
										alt={`${post.title} 썸네일`}
										width={640}
										height={360}
										className="size-full object-cover"
										fallbackClassName="object-contain p-5"
										isScaledOnInteraction
									/>
								</div>

								<article className="flex min-w-0 flex-col justify-between py-1">
									<h2 className="line-clamp-2 text-body-3 font-semibold text-text-primary transition-colors duration-200 group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring motion-reduce:transition-none sm:text-body-4">
										{post.title}
									</h2>
									<div className="flex items-center gap-1.5 text-label-2 text-navy-600">
										<UserAvatar
											src={post.author.profileImageUrl ?? undefined}
											fallback={post.author.nickname.slice(0, 1)}
											label={`${post.author.nickname} 프로필`}
											size="sm"
											className="bg-navy-100"
										/>
										<span className="min-w-0 truncate">{post.author.nickname}</span>
										<span aria-hidden="true">·</span>
										<time dateTime={post.publishedAt} className="hidden sm:inline">
											{formatPublishedDate(post.publishedAt)}
										</time>
										<time dateTime={post.publishedAt} aria-hidden={true} className="sm:hidden">
											{formatPublishedDate(post.publishedAt, true)}
										</time>
									</div>
								</article>
							</CustomLink>
						</li>
					))}
				</ul>
			)}

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
