import type { PostDetailAuthor } from '@/domains/post/model/post';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface PostDetailAuthorProfileProps {
	author: PostDetailAuthor;
}

export default function PostDetailAuthorProfile({ author }: PostDetailAuthorProfileProps) {
	return (
		<section aria-labelledby="post-author-heading" className="text-center">
			<CustomLink
				href={buildBlogHomePath(author.slug)}
				className="group inline-flex flex-col items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
			>
				<UserAvatar
					src={author.profileImageUrl}
					fallback={author.nickname.slice(0, 1)}
					label={`${author.nickname} 프로필`}
					size="xl"
				/>
				<h2
					id="post-author-heading"
					className="mt-4 text-title-1 font-semibold wrap-break-word text-text-primary transition-colors group-hover:text-brand-primary-hover sm:text-title-2"
				>
					{author.nickname}
				</h2>
				{author.description ? <p className="mt-1 text-body-1 text-text-secondary">{author.description}</p> : null}
			</CustomLink>
		</section>
	);
}
