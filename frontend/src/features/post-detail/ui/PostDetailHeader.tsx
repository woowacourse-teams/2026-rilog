import type { ReactNode } from 'react';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { PostCategory, PostDetailChapter, PostViewerPermissions } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

import PostDetailActions from './PostDetailActions';

interface PostDetailHeaderProps {
	publisher?: ReactNode;
	postId: number;
	slug: string;
	title: string;
	// description: string;
	publishedAt: string;
	category: PostCategory;
	chapter: PostDetailChapter | null;
	author: User;
	viewerPermissions: PostViewerPermissions;
}

export default function PostDetailHeader({
	publisher,
	postId,
	slug,
	title,
	// description,
	publishedAt,
	category,
	chapter,
	author,
	viewerPermissions,
}: PostDetailHeaderProps) {
	return (
		<header className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 pt-12 pb-8 text-center sm:px-8 sm:pt-16 sm:pb-10 lg:px-0 lg:pt-20 lg:pb-10">
			{publisher}

			<h1 className="text-heading-4 font-extrabold [overflow-wrap:anywhere] break-keep text-text-primary sm:text-heading-1">
				{title}
			</h1>

			{/* TODO: 게시글 상세 API에 description 필드가 추가되면 다시 활성화한다. */}
			{/* {description ? (
				<p className="mt-5 max-w-2xl text-body-1 wrap-break-word break-keep text-text-secondary sm:mt-6 sm:text-body-2">
					{description}
				</p>
			) : null} */}

			<div className="mt-6 flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-3 text-label-2 text-text-secondary sm:mt-7">
				<CustomLink
					href={buildBlogHomePath(author.slug)}
					className="flex items-center gap-1.5 rounded-full transition-colors hover:text-focus-ring hover:underline hover:underline-offset-2 focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring active:text-focus-ring"
				>
					<UserAvatar
						src={author.profileImageUrl ?? undefined}
						fallback={author.nickname.slice(0, 1)}
						label={`${author.nickname} 프로필`}
						size="sm"
					/>
					<span>{author.nickname}</span>
				</CustomLink>
				<span aria-hidden="true">·</span>
				<span>{category === 'IT' ? '기술' : '일상'}</span>
				<span aria-hidden="true">·</span>
				<time dateTime={toApiUtcISOString(publishedAt)}>{formatPublishedDate(publishedAt)}</time>

				<PostDetailActions slug={slug} postId={postId} viewerPermissions={viewerPermissions} />
			</div>
		</header>
	);
}
