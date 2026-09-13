import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';

import PostDetailBlogProfile from './PostDetailBlogProfile';

interface PostDetailBlogProfileSectionProps {
	blogSlug: string;
}

export default async function PostDetailBlogProfileSection({ blogSlug }: PostDetailBlogProfileSectionProps) {
	const profileData = await getBlogPublicProfile(blogSlug);

	if (profileData === null) return null;

	return <PostDetailBlogProfile profile={profileData.profile} />;
}
