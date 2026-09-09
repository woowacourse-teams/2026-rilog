import type { PostDetailAuthor } from '@/domains/post/model/post';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface PostDetailAuthorProfileSmallProps {
	author: PostDetailAuthor;
}

export default function PostDetailAuthorProfileSmall({ author }: PostDetailAuthorProfileSmallProps) {
	const hasDescription = !!author.description;

	return (
		<section aria-labelledby="post-author-heading" className="flex justify-center">
			<CustomLink
				href={buildBlogHomePath(author.slug)}
				className={`group flex gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring ${hasDescription ? 'items-start' : 'items-center'}`}
			>
				<UserAvatar
					src={author.profileImageUrl}
					fallback={author.nickname.slice(0, 1)}
					label={`${author.nickname} 프로필`}
					className="size-10! sm:size-12!"
				/>
				<div className={`flex flex-col`}>
					<h2
						id="post-author-heading"
						className="text-body-2 font-semibold wrap-break-word text-text-primary transition-colors group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring sm:text-body-2"
					>
						{author.nickname}
					</h2>
					{hasDescription ? <p className="text-body-1 text-text-secondary">{author.description}</p> : null}
				</div>
			</CustomLink>
		</section>
	);
}
