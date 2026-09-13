import type { BaseBlog } from '@/domains/blog/model/blog';
import CologAvatar from '@/domains/blog/ui/CologAvatar';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import BlogProfileEntryLink from '@/features/analytics/ui/BlogProfileEntryLink';
import { buildBlogHomePath } from '@/shared/routes/app-routes';

interface PostDetailBlogProfileProps {
	profile: BaseBlog;
}

export default function PostDetailBlogProfile({ profile }: PostDetailBlogProfileProps) {
	const avatar =
		profile.type === 'COLOG' ? (
			<CologAvatar
				src={profile.profileImageUrl}
				fallback={profile.name.slice(0, 1)}
				label={`${profile.name} 팀 로고`}
				size="xl"
			/>
		) : (
			<UserAvatar
				src={profile.profileImageUrl}
				fallback={profile.name.slice(0, 1)}
				label={`${profile.name} 개인 블로그 프로필`}
				size="xl"
			/>
		);

	return (
		<section aria-labelledby="post-blog-profile-heading" className="text-center">
			<BlogProfileEntryLink
				href={buildBlogHomePath(profile.slug)}
				entrySource="post_detail_bottom_profile"
				className="group inline-flex flex-col items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
			>
				{avatar}
				<h2
					id="post-blog-profile-heading"
					className="mt-4 text-title-1 font-semibold [overflow-wrap:anywhere] text-text-primary transition-colors group-hover:text-focus-ring group-focus-visible:text-focus-ring group-active:text-focus-ring sm:text-title-2"
				>
					{profile.name}
				</h2>
				{profile.description ? <p className="mt-1 text-body-1 text-text-secondary">{profile.description}</p> : null}
			</BlogProfileEntryLink>
		</section>
	);
}
