import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import BlogProfileHero from '@/features/blog-profile/ui/BlogProfileHero';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';

interface BlogHomeHeroProps {
	profile: BlogPublicProfile;
}

export default function BlogHomeHero({ profile }: BlogHomeHeroProps) {
	const action = profile.type === 'COLOG' ? <CologSettingsButton slug={profile.slug} isOnCover /> : undefined;

	return <BlogProfileHero profile={profile} action={action} />;
}
