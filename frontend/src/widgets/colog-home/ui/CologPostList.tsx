import Link from 'next/link';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { PostSummary } from '@/domains/post/model/post';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import PostFeedImage from '@/features/post-feed/ui/PostFeedImage';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

interface CologPostListProps {
	slug: string;
	posts: readonly PostSummary[];
}

export default function CologPostList({ slug, posts }: CologPostListProps) {
	return (
		<section aria-label="코로그 게시글" className="min-w-0">
			{posts.length === 0 ? (
				<p className="text-body-2 text-text-secondary">아직 작성된 게시글이 없습니다.</p>
			) : (
				<ul className="flex flex-col gap-7">
					{posts.map((post) => (
						<li key={post.id}>
							<Link
								href={buildPostDetailPath(slug, String(post.id))}
								className="group flex gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
							>
								<div className="relative aspect-[3/2] h-24 shrink-0 overflow-hidden rounded-lg bg-surface-hover sm:h-27">
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
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
