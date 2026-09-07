import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import type { PostFeedItem } from '@/domains/post/model/post';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { recordPostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { buildBlogHomePath, buildPostDetailPath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

import PostFeedImage from './PostFeedImage';

interface PostFeedCardProps {
	post: PostFeedItem;
	position: number;
}

export default function PostFeedCard({ post, position }: PostFeedCardProps) {
	const handleClick = () => {
		recordPostDetailEntryContext({
			postId: post.id,
			entrySource: 'feed',
			feedPosition: position,
		});
	};

	const postPath = buildPostDetailPath(post.blog.slug, String(post.id));

	return (
		<li className="h-full [contain-intrinsic-size:auto_24rem] [content-visibility:auto]">
			<article className="group/card relative isolate flex h-full cursor-pointer flex-col">
				<div className="aspect-video overflow-hidden rounded-xl bg-thumbnail-background">
					<PostFeedImage
						src={post.thumbnailUrl}
						fallbackSrc={POST_THUMBNAIL_FALLBACK_URL}
						alt={`${post.title} 썸네일`}
						width={640}
						height={360}
						className="size-full object-cover"
						isScaledOnInteraction
					/>
				</div>
				<div className="mt-2 flex min-w-0 items-center text-body-1">
					{post.blog.type === 'RILOG' && (
						<CustomLink
							href={buildBlogHomePath(post.author.slug)}
							className="group relative z-20 flex min-w-0 items-center gap-1.5 rounded-sm text-text-secondary hover:text-focus-ring focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<UserAvatar
								src={post.author.profileImageUrl ?? undefined}
								fallback={post.author.nickname.slice(0, 1)}
								label={`${post.author.nickname} 프로필`}
								size="sm"
							/>
							<span className="truncate group-hover:underline group-focus-visible:underline">
								{post.author.nickname}
							</span>
						</CustomLink>
					)}
					{post.blog.type === 'COLOG' && (
						<CustomLink
							href={buildBlogHomePath(post.blog.slug)}
							className="group relative z-20 flex min-w-0 items-center gap-1.5 rounded-sm text-text-secondary hover:text-focus-ring focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<span className="size-5 shrink-0 overflow-hidden rounded-md border border-border-default bg-background">
								<PostFeedImage
									src={post.blog.profileImageUrl}
									alt={post.blog.name}
									width={20}
									height={20}
									className="size-full object-cover"
									fallbackClassName="object-contain p-1"
								/>
							</span>
							<span className="truncate group-hover:underline group-focus-visible:underline">{post.blog.name}</span>
						</CustomLink>
					)}
					<span aria-hidden="true" className="shrink-0 text-text-secondary">
						.
					</span>
					{post.chapterName && <span className="ml-1 min-w-0 flex-1 truncate text-navy-400">{post.chapterName}</span>}
				</div>
				<CustomLink
					href={postPath}
					onClick={handleClick}
					className="group/title mt-1 flex-1 before:absolute before:inset-0 before:z-0 before:rounded-xl before:content-[''] focus-visible:outline-none focus-visible:before:outline-2 focus-visible:before:outline-offset-4 focus-visible:before:outline-focus-ring"
				>
					<h3 className="relative z-10 line-clamp-2 min-h-[2lh] text-body-3 font-semibold wrap-break-word break-keep">
						<span className="text-text-primary transition-colors duration-200 hover:text-focus-ring motion-reduce:transition-none">
							{post.title}
						</span>
					</h3>
				</CustomLink>
				<time dateTime={toApiUtcISOString(post.publishedAt)} className="mt-3 text-left text-caption-2 text-navy-600">
					{formatPublishedDate(post.publishedAt)}
				</time>
			</article>
		</li>
	);
}
