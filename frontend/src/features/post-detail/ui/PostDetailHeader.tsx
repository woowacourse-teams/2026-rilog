import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { PostViewerPermissions } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

import PostDetailActions from './PostDetailActions';

interface PostDetailHeaderProps {
	postId: number;
	slug: string;
	title: string;
	publishedAt: string;
	author: User;
	viewerPermissions: PostViewerPermissions;
}

export default function PostDetailHeader({
	postId,
	slug,
	title,
	publishedAt,
	author,
	viewerPermissions,
}: PostDetailHeaderProps) {
	return (
		<header className="flex flex-col items-center pt-12 pb-9 text-center sm:pt-14">
			<h1 className="text-heading-4 font-extrabold wrap-break-word break-keep text-text-primary sm:text-heading-2">
				{title}
			</h1>

			<div className="relative mt-7 flex w-full items-center justify-center gap-3 text-label-2 text-text-secondary">
				<CustomLink
					href={buildBlogHomePath(author.slug)}
					className="flex items-center gap-2 rounded-full transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
				>
					<UserAvatar
						src={author.profileImageUrl ?? undefined}
						fallback={author.nickname.slice(0, 1)}
						label={`${author.nickname} 프로필`}
						size="md"
					/>
					<span>{author.nickname}</span>
				</CustomLink>
				<span aria-hidden="true">·</span>
				<time dateTime={toApiUtcISOString(publishedAt)}>{formatPublishedDate(publishedAt)}</time>

				<PostDetailActions slug={slug} postId={postId} viewerPermissions={viewerPermissions} />
			</div>
		</header>
	);
}
