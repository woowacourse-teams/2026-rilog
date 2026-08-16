import Link from 'next/link';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { PostFeedItem } from '@/domains/post/model/post-feed';
import UserAvatar from '@/domains/user/ui/UserAvatar';

import PostFeedCologBadge from './PostFeedCologBadge';
import PostFeedImage from './PostFeedImage';

interface PostFeedCardProps {
	post: PostFeedItem;
}

export default function PostFeedCard({ post }: PostFeedCardProps) {
	return (
		<li className="[contain-intrinsic-size:auto_24rem] [content-visibility:auto]">
			<Link
				href={`/posts/${post.id}`}
				className="group relative z-0 block h-full rounded-xl hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring active:z-10"
			>
				<article className="flex h-full flex-col">
					<div className="relative aspect-video overflow-hidden rounded-xl bg-surface-hover">
						<PostFeedImage
							src={post.thumbnailUrl}
							alt={`${post.title} 썸네일`}
							width={640}
							height={360}
							className="size-full object-cover"
							fallbackClassName="object-contain p-10 sm:p-12"
							isScaledOnInteraction
						/>
						{post.colog !== null && <PostFeedCologBadge colog={post.colog} />}
					</div>

					<div className="mt-4 flex flex-1 flex-col">
						<h3 className="line-clamp-2 min-h-14 text-title-1 font-semibold wrap-break-word break-keep text-text-primary transition-colors duration-200 group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring motion-reduce:transition-none">
							{post.title}
						</h3>
						<div className="mt-auto flex min-w-0 items-center gap-2 pt-3 text-body-1 text-text-secondary">
							<UserAvatar
								src={post.author.profileImageUrl ?? undefined}
								fallback={post.author.nickname.slice(0, 1)}
								label={`${post.author.nickname} 프로필`}
								size="md"
							/>
							<span className="min-w-0 truncate font-medium">{post.author.nickname}</span>
							<span aria-hidden="true">·</span>
							<time dateTime={post.publishedAt} className="shrink-0">
								{formatPublishedDate(post.publishedAt)}
							</time>
						</div>
					</div>
				</article>
			</Link>
		</li>
	);
}
