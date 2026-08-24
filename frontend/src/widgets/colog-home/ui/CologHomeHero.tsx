import { notFound } from 'next/navigation';

import BlogProfileViewTracker from '@/features/analytics/ui/BlogProfileViewTracker';
import CologProfileHero from '@/features/colog-profile/ui/CologProfileHero';
import CologSettingsButton from '@/features/colog-settings-access/ui/CologSettingsButton';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { mapCologProfileResponse } from '../lib/map-colog-profile-response';

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

	const profile = mapCologProfileResponse(profileResponse.data);
	const hasCoverImage = getImageUrl(profile.coverImageUrl) !== '';

	return (
		<>
			<BlogProfileViewTracker blogType="COLOG" />
			<CologProfileHero
				profile={profile}
				action={<CologSettingsButton slug={profile.slug} isOnCover={hasCoverImage} />}
			/>
		</>
	);
}
