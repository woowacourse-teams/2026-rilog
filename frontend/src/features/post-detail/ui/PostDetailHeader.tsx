import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import type { User } from '@/domains/user/model/user';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface PostDetailHeaderProps {
	title: string;
	publishedAt: string;
	author: User;
}

export default function PostDetailHeader({ title, publishedAt, author }: PostDetailHeaderProps) {
	return (
		<header className="flex flex-col items-center pt-12 pb-9 text-center sm:pt-14">
			<h1 className="text-heading-4 font-extrabold wrap-break-word break-keep text-text-primary sm:text-heading-2">
				{title}
			</h1>

			<div className="mt-7 flex items-center gap-3 text-label-2 text-text-secondary">
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
				<time dateTime={publishedAt}>{formatPublishedDate(publishedAt)}</time>
			</div>
		</header>
	);
}
