import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';

import PostDetailAuthorProfileSmall from './PostDetailAuthorProfileSmall';

interface PostDetailAuthorProfileSectionProps {
	authorSlug: string;
}

export default async function PostDetailAuthorProfileSection({ authorSlug }: PostDetailAuthorProfileSectionProps) {
	const profileData = await getBlogPublicProfile(authorSlug);

	if (profileData === null) return null;

	const { profile } = profileData;

	return (
		<PostDetailAuthorProfileSmall
			author={{
				id: profile.id,
				nickname: profile.name,
				slug: profile.slug,
				profileImageUrl: profile.profileImageUrl,
				description: profile.description ?? null,
			}}
		/>
	);
}
