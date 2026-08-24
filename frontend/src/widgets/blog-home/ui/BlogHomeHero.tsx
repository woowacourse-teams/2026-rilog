import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import BlogProfileHero from '@/features/blog-profile/ui/BlogProfileHero';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import { getImageUrl } from '@/shared/utils/get-image-url';

interface BlogHomeHeroProps {
	profile: BlogPublicProfile;
}

export default function BlogHomeHero({ profile }: BlogHomeHeroProps) {
	const hasCoverImage = getImageUrl(profile.coverImageUrl) !== '';
	const action =
		profile.type === 'COLOG' ? <CologSettingsButton slug={profile.slug} isOnCover={hasCoverImage} /> : undefined;

	return <BlogProfileHero profile={profile} action={action} />;
}
