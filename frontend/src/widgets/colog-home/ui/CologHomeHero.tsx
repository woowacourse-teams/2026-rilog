import { notFound } from 'next/navigation';

import { mapBlogPublicProfileResponse } from '@/features/blog-profile/lib/map-blog-public-profile-response';
import CologProfileHero from '@/features/colog-profile/ui/CologProfileHero';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { getImageUrl } from '@/shared/utils/get-image-url';

interface CologHomeHeroProps {
	slug: string;
}

export default async function CologHomeHero({ slug }: CologHomeHeroProps) {
	let profileResponse;

	try {
		profileResponse = await readBlogPublicProfile({ slug });
	} catch {
		notFound();
	}

	if (!profileResponse?.data) {
		notFound();
	}

	const profile = mapBlogPublicProfileResponse(profileResponse.data);
	const hasCoverImage = getImageUrl(profile.coverImageUrl) !== '';

	return (
		<CologProfileHero
			profile={profile}
			action={<CologSettingsButton slug={profile.slug} isOnCover={hasCoverImage} />}
		/>
	);
}
