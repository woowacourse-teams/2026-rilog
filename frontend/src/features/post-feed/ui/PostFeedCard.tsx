import CustomLink from '@/shared/ui/link/CustomLink';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import type { PostFeedItem } from '@/domains/post/model/post';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

import PostFeedCologBadge from './PostFeedCologBadge';
import PostFeedImage from './PostFeedImage';

interface PostFeedCardProps {
	post: PostFeedItem;
}

export default function PostFeedCard({ post }: PostFeedCardProps) {
	return (
		<li className="[contain-intrinsic-size:auto_24rem] [content-visibility:auto]">
			<CustomLink
				href={buildPostDetailPath(post.blog.slug, String(post.id))}

				className="group relative z-0 block h-full rounded-xl hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring active:z-10"
			>
				<article className="flex h-full flex-col">
					<div className="relative aspect-video overflow-hidden rounded-xl bg-surface-hover">
						<PostFeedImage
							src={post.thumbnailUrl}
							fallbackSrc={POST_THUMBNAIL_FALLBACK_URL}
							alt={`${post.title} 썸네일`}
							width={640}
							height={360}
							className="size-full object-cover"
							isScaledOnInteraction
						/>
						{post.blog.type === 'COLOG' && <PostFeedCologBadge colog={post.blog} />}
					</div>

					<div className="mt-4 flex flex-1 flex-col">
						<h3 className="line-clamp-2 text-title-1 font-semibold wrap-break-word break-keep text-text-primary transition-colors duration-200 group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring motion-reduce:transition-none">
							{post.title}
						</h3>
						<div className="mt-auto flex min-w-0 items-center gap-2 pt-3 text-body-1 text-text-secondary">
							<UserAvatar
								src={post.author.profileImageUrl ?? undefined}
								fallback={post.author.nickname.slice(0, 1)}
								label={`${post.author.nickname} 프로필`}
								size="sm"
							/>
							<span className="min-w-0 truncate font-medium">{post.author.nickname}</span>
							<span aria-hidden="true">·</span>
							<time dateTime={post.publishedAt} className="shrink-0 pr-1">
								{formatPublishedDate(post.publishedAt)}
							</time>
						</div>
					</div>
				</article>
			</CustomLink>
		</li>
	);
}
